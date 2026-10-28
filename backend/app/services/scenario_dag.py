from __future__ import annotations

from backend.app.schemas import DecisionInput, ConstraintReport, DecisionDAG, DAGNode, DAGEdge
from backend.app.services.constraint_engine import assess_decision


def build_decision_dag(request: DecisionInput, report: ConstraintReport | None = None) -> DecisionDAG:
    """
    Construct a structured, layered Directed Acyclic Graph (DAG)
    representing the decision options, prerequisite dependencies, resource conflicts,
    and reversible experiment checkpoints.
    """
    if report is None:
        report = assess_decision(request)

    nodes: list[DAGNode] = []
    edges: list[DAGEdge] = []
    bottlenecks: list[str] = []

    # Root Decision Node (Level 0)
    root_id = "node_decision_root"
    nodes.append(DAGNode(
        id=root_id,
        label=request.question[:45] + ("..." if len(request.question) > 45 else ""),
        type="decision",
        status="FEASIBLE",
        details=request.question,
        x=450.0,
        y=40.0,
    ))

    assessment_map = {a.option_id: a for a in report.option_assessments}
    x_spacing = 900.0 / (len(request.options) + 1)
    feasible_options: list[str] = []

    for i, opt in enumerate(request.options):
        col_x = (i + 1) * x_spacing
        opt_node_id = f"node_opt_{opt.id}"
        assessment = assessment_map.get(opt.id)
        overall_status = assessment.overall_status if assessment else "UNKNOWN"

        if overall_status == "FEASIBLE":
            feasible_options.append(opt.name)

        # 1. Option Node (Level 1)
        nodes.append(DAGNode(
            id=opt_node_id,
            label=opt.name,
            type="option",
            status=overall_status,
            details=opt.description or f"Alternative branch: {opt.name}",
            x=col_x,
            y=140.0,
        ))
        edges.append(DAGEdge(
            id=f"edge_root_{opt.id}",
            source=root_id,
            target=opt_node_id,
            label="Option branch",
            status="active",
        ))

        # 2. Prerequisite Dependencies (Level 2)
        prereq_parent_id = opt_node_id
        if opt.prerequisites:
            for p_idx, prereq in enumerate(opt.prerequisites[:3]):
                is_verified = prereq.strip().lower().startswith("[x]")
                p_node_id = f"node_prereq_{opt.id}_{p_idx}"
                clean_label = prereq.replace("[x]", "").replace("[X]", "").strip()
                status_val = "VERIFIED" if is_verified else "PENDING"
                if not is_verified:
                    bottlenecks.append(f"{opt.name}: Unverified dependency '{clean_label}'")

                nodes.append(DAGNode(
                    id=p_node_id,
                    label=clean_label[:28] + ("..." if len(clean_label) > 28 else ""),
                    type="prereq",
                    status=status_val,
                    details=f"Dependency: {clean_label} ({'Completed' if is_verified else 'Unverified'})",
                    x=col_x - 30.0 + (p_idx * 30.0),
                    y=230.0 + (p_idx * 55.0),
                ))
                edges.append(DAGEdge(
                    id=f"edge_opt_prereq_{opt.id}_{p_idx}",
                    source=prereq_parent_id,
                    target=p_node_id,
                    label="requires",
                    status="active" if is_verified else "warning",
                ))
                prereq_parent_id = p_node_id

        # 3. Resource & Capacity Feasibility Check (Level 3)
        res_node_id = f"node_res_{opt.id}"
        time_info = f"{assessment.required_hours_per_week or '?'}h/wk" if assessment else ""
        cost_info = f"NPR {assessment.projected_total_cost_npr:,.0f}" if assessment and assessment.projected_total_cost_npr else ""
        res_label = f"{time_info} | {cost_info}" if time_info or cost_info else "Resource Check"

        if overall_status == "CONFLICT":
            bottlenecks.append(f"{opt.name}: Resource conflict ({assessment.explanation if assessment else ''})")

        nodes.append(DAGNode(
            id=res_node_id,
            label=f"Feasibility: {overall_status}",
            type="bottleneck" if overall_status == "CONFLICT" else "resource",
            status=overall_status,
            details=assessment.explanation if assessment else res_label,
            x=col_x,
            y=410.0,
        ))
        edges.append(DAGEdge(
            id=f"edge_prereq_res_{opt.id}",
            source=prereq_parent_id,
            target=res_node_id,
            label="capacity evaluation",
            status="blocked" if overall_status == "CONFLICT" else "active",
        ))

        # 4. 12-Month Projected Outcome Horizon (Level 4)
        outcome_node_id = f"node_outcome_{opt.id}"
        nodes.append(DAGNode(
            id=outcome_node_id,
            label=f"{report.time_horizon_months}M Horizon",
            type="outcome",
            status=overall_status,
            details=f"Projected {report.time_horizon_months}-month state under {opt.name} assumptions.",
            x=col_x,
            y=510.0,
        ))
        edges.append(DAGEdge(
            id=f"edge_res_outcome_{opt.id}",
            source=res_node_id,
            target=outcome_node_id,
            label="projected path",
            status="active" if overall_status == "FEASIBLE" else "warning",
        ))

    # Shared Reversible Experiment Node
    exp_node_id = "node_reversible_experiment"
    exp_text = request.reversible_experiment.strip() or "Low-cost micro-trial"
    nodes.append(DAGNode(
        id=exp_node_id,
        label="1-2 Week Reversible Pilot",
        type="experiment",
        status="FEASIBLE" if request.reversible_experiment.strip() else "PENDING",
        details=exp_text,
        x=450.0,
        y=610.0,
    ))

    # Connect outcomes to the experiment gate
    for opt in request.options:
        outcome_node_id = f"node_outcome_{opt.id}"
        edges.append(DAGEdge(
            id=f"edge_outcome_exp_{opt.id}",
            source=outcome_node_id,
            target=exp_node_id,
            label="de-risk with experiment",
            status="active",
        ))

    rec = feasible_options[0] if feasible_options else (request.options[0].name if request.options else "Option 1")

    return DecisionDAG(
        nodes=nodes,
        edges=edges,
        critical_bottlenecks=bottlenecks,
        recommended_path=f"Prioritize '{rec}' with low-friction 1-week pilot before irreversible commitment.",
    )
