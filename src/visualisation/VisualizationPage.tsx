import { useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router"
import cytoscape from "cytoscape"
import type { WorkbookData } from "../lib/workbookData.ts"

export default function VisualizationPage() {
    const graphZone = useRef<HTMLDivElement>(null)
    const cy = useRef<cytoscape.Core | null>(null)
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
        if (!graphZone.current) return

        const { data } = (location.state ?? {}) as {
            data: WorkbookData | undefined
        }

        if (!data) {
            navigate("/")
            return
        }

        cy.current = doRender(graphZone.current, data)

        return () => {
            cy.current?.destroy()
            cy.current = null
        }
    }, [location.state, navigate])

    return <div className="w-full h-[1000px] block" ref={graphZone} />
}

function doRender(el: HTMLDivElement, data: WorkbookData) {
    const { pairings, teachers, students } = data

    const GREEN = "#22c55e" // students
    const RED = "#ef4444" // teachers

    const cy = cytoscape({
        container: el,
        elements: {
            nodes: [
                ...teachers.map(id => ({ data: { id }, classes: "teacher" })),
                ...students.map(id => ({ data: { id }, classes: "student" })),
            ],
            edges: pairings.map(([a, b]) => ({
                data: { id: `${a}__${b}`, source: a, target: b },
            })),
        },
        style: [
            // Base node style
            {
                selector: "node",
                style: {
                    label: "data(id)",
                    "text-valign": "center",
                    "text-halign": "center",
                    "font-size": 12,
                    width: 36,
                    height: 36,
                    color: "#1f2937",
                    "border-color": "#374151",
                    "border-width": 1,
                },
            },
            // Students = green
            {
                selector: ".student",
                style: { shape: "ellipse", "background-color": GREEN },
            },
            // Teachers = red
            {
                selector: ".teacher",
                style: { shape: "round-rectangle", "background-color": RED },
            },
            // Base edge style (hidden by default)
            {
                selector: "edge",
                style: {
                    "curve-style": "bezier",
                    "target-arrow-shape": "triangle",
                    width: 2,
                    opacity: 0, // hide by default
                    "line-color": "#bbb",
                    "target-arrow-color": "#bbb",
                },
            },
            // Visible edges (for selected nodes)
            {
                selector: "edge.visible",
                style: {
                    opacity: 1,
                    "z-index": 10,
                    width: "2px",
                },
            },
        ],
        layout: {
            name: "breadthfirst",
            directed: false,
            roots: students, // put all students on first rank
            spacingFactor: 5,
            animate: true,
        },
        wheelSensitivity: 1,
        // Optional: improve multi-selection UX (esp. with box select)
        selectionType: "additive",
    })

    // Clear all edge visibility classes
    const resetEdges = () => {
        cy.edges().removeClass("visible")
    }

    // Show edges that connect to ANY selected node
    const updateEdgesForSelection = () => {
        resetEdges()

        const selectedNodes = cy.$("node:selected")
        if (selectedNodes.empty()) return

        const connectedEdges = selectedNodes.connectedEdges()
        connectedEdges.addClass("visible")
    }

    // Whenever a node is selected or unselected, recompute visible edges
    cy.on("select", "node", () => {
        updateEdgesForSelection()
    })

    cy.on("unselect", "node", () => {
        updateEdgesForSelection()
    })

    // Clicking on empty space clears selection → edges hidden
    cy.on("tap", evt => {
        if (evt.target === cy) {
            cy.$("node:selected").unselect()
            resetEdges()
        }
    })

    return cy
}
