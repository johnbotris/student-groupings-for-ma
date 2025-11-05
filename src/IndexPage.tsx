import { type ChangeEvent, useState } from "react"
import { parseStudentWorkbook } from "./lib/parseStudentsWorkbook.ts"
import { useNavigate } from "react-router"

function IndexPage() {
    const [file, setFile] = useState<File>()
    const navigate = useNavigate()

    function onFileSelected(event: ChangeEvent) {
        setFile((event.target as HTMLInputElement).files?.[0])
    }

    async function onRunClicked() {
        if (!file) {
            console.error("no file")
            return
        }

        navigate("/visualize", {
            state: { data: parseStudentWorkbook(await file.arrayBuffer()) },
        })
    }

    return (
        <div className={"flex flex-col gap-4"}>
            <div className="flex flex-row gap-2">
                <input type="file" onChange={onFileSelected} />
                <button type="button" disabled={!file} onClick={onRunClicked}>
                    go!
                </button>
            </div>
        </div>
    )
}

export default IndexPage
