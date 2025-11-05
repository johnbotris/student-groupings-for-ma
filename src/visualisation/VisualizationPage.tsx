import { useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router"
import cytoscape from "cytoscape"
import type { WorkbookData } from "../lib/workbookData.ts"

export default function VisualizationPage() {
    const graphZone = useRef<HTMLDivElement>(null)
    const cy = useRef<cytoscape.Core>(null)
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
        if (!graphZone.current) {
            return
        }

        const { data } = location.state as {
            data: WorkbookData | undefined
        }

        if (!data) {
            navigate("/")
            return
        }

        cy.current = doRender(graphZone.current, data)
    }, [location.state, navigate])

    return (
        <>
            <div className={"w-full h-[1000px] block"} ref={graphZone}></div>
        </>
    )
}

function doRender(el: HTMLDivElement, data: WorkbookData) {
    const { pairings, teachers, students } = data

    return cytoscape({
        container: el,
        elements: {
            nodes: [
                ...teachers.map(id => ({
                    data: { id, classes: "teacher" },
                })),
                ...students.map(id => ({
                    data: { id, classes: "student" },
                })),
            ],
            edges: pairings.map(([a, b]) => ({
                data: {
                    id: `${a}${b}`,
                    source: a,
                    target: b,
                },
            })),
        },
        style: [
            {
                selector: "node",
                style: {
                    label: "data(label)",
                    "text-valign": "center",
                    "text-halign": "center",
                    "font-size": 12,
                    width: 36,
                    height: 36,
                    color: "#222",
                    "border-color": "#333",
                    "border-width": 1,
                },
            },
            {
                selector: ".student",
                style: { shape: "ellipse", "background-color": "#7dd3fc" },
            },
            {
                selector: ".teacher",
                style: {
                    shape: "round-rectangle",
                    "background-color": "#a7f3d0",
                },
            },
            {
                selector: "edge",
                style: {
                    "curve-style": "bezier",
                    "target-arrow-shape": "triangle",
                    width: 2,
                    "line-color": "#bbb",
                    "target-arrow-color": "#bbb",
                },
            },
        ],
        layout: {
            name: "breadthfirst",
            directed: true,
            // Put all students on the first rank:
            roots: students,
            spacingFactor: 1.2,
            animate: true,
        },
        wheelSensitivity: 0.2,
    })
}
