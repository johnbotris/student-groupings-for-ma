import { type PropsWithChildren, useCallback, useState } from "react"
import { parseStudentWorkbook } from "./lib/parseStudentsWorkbook.ts"
import { useLocalStorage } from "./lib/useLocalStorage.ts"
import { School } from "./lib/school.ts"
import type { Group } from "./lib/group.ts"
import { generateOutputWorkbook } from "./lib/generateOutputWorkbook.ts"
import type { TeacherId } from "./lib/teacherId.ts"
import type { StudentId } from "./lib/studentId.ts"
import v5 from "./lib/createGroupingsV5.ts"
import { parseExistingResults } from "./lib/parseExistingResults.ts"

const KEEP_HISTORY = 15

export default function App() {
    const [school, setSchool] = useLocalStorage<School | null>("school", null, {
        serialization: {
            serialize: School.serialize,
            deserialize: School.deserialize,
        },
    })

    const [groupHistory, setGroupHistory] = useLocalStorage<Group[][]>(
        "groupHistory",
        [],
    )

    const [groupHistoryCursor, setGroupHistoryCursor] = useLocalStorage<number>(
        "group-history-cursor",
        -1,
    )

    const [teachersPerGroup, setTeachersPerGroup] = useLocalStorage(
        "teacher-per-group",
        4,
    )

    const algorithms = {
        current: v5,
    }

    const [selectedAlgorithm, setSelectedAlgorithm] = useLocalStorage<
        keyof typeof algorithms
    >("selected-algorithm", "current")

    const createGroupings = algorithms[selectedAlgorithm]

    const groupings = groupHistory.at(groupHistoryCursor)

    const resultSize = groupings?.flat().length ?? 0

    const createGroups = useCallback(() => {
        if (!school) return
        console.log("grouping with ", teachersPerGroup)
        setGroupHistory(history => {
            try {
                return [
                    ...history,
                    createGroupings(school, { teachersPerGroup }),
                ].slice(history.length - KEEP_HISTORY)
            } catch (e) {
                console.error(e)
                return history
            }
        })

        setGroupHistoryCursor(-1)
    }, [
        createGroupings,
        school,
        setGroupHistory,
        setGroupHistoryCursor,
        teachersPerGroup,
    ])

    async function openClassList() {
        const file = await openFile()
        const { pairings } = parseStudentWorkbook(file)
        setSchool(School.create(pairings))
    }

    async function openExistingResults() {
        const file = await openFile()
        const groups = parseExistingResults(file) as Group[]
        setGroupHistoryCursor(-1)
        setGroupHistory([groups])
    }

    function openFile(): Promise<ArrayBuffer> {
        return new Promise(resolve => {
            const input = document.createElement("input")
            input.type = "file"
            input.accept = ".xlsx"
            input.onchange = async ev => {
                const file = (ev.currentTarget as HTMLInputElement).files?.[0]
                if (file) resolve(await file.arrayBuffer())
            }

            input.click()
        })
    }

    const sortedTeachers = school
        ? school.teachers.toSorted(
              (a, b) =>
                  school.getStudents(a).length - school.getStudents(b).length,
          )
        : []

    function go() {
        if (!groupings?.length) {
            return
        }
        const buffer = generateOutputWorkbook(groupings)
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "result.xlsx"
        a.click()
        URL.revokeObjectURL(url)
    }

    function lookBack() {
        setGroupHistoryCursor(c =>
            c === -1 ? groupHistory.length - 2 : Math.max(c - 1, 0),
        )
    }

    function lookForward() {
        setGroupHistoryCursor(c => Math.min(c + 1, groupHistory.length))
    }

    return (
        <div className="flex flex-col gap-2">
            <div className={"flex flex-row gap-4"}>
                <NiceButton onClick={() => openClassList()}>
                    open class list
                </NiceButton>

                <NiceButton onClick={() => openExistingResults()}>
                    load existing results
                </NiceButton>

                {school && (
                    <>
                        <select
                            onChange={e =>
                                setSelectedAlgorithm(
                                    e.target.value as keyof typeof algorithms,
                                )
                            }
                        >
                            {Object.keys(algorithms).map(k => (
                                <option key={k} value={k}>
                                    algorithm {k}
                                </option>
                            ))}
                        </select>

                        <input
                            type="number"
                            className="bg-gray-800 text-gray-200 text-sm
             px-3 py-1.5 rounded-md border border-gray-700
             focus:outline-none focus:ring-2 focus:ring-gray-600
             w-20"
                            value={teachersPerGroup}
                            onChange={e =>
                                setTeachersPerGroup(Number(e.target.value))
                            }
                        />

                        <NiceButton onClick={createGroups}>generate</NiceButton>

                        <NiceButton onClick={go}>save result</NiceButton>

                        <NiceButton
                            disabled={
                                groupHistory.length === 1 ||
                                groupHistoryCursor === 0
                            }
                            onClick={lookBack}
                        >
                            previous result
                        </NiceButton>

                        <NiceButton
                            disabled={
                                groupHistory.length === 1 ||
                                groupHistoryCursor === -1 ||
                                groupHistoryCursor === groupHistory.length - 1
                            }
                            onClick={lookForward}
                        >
                            next result
                        </NiceButton>
                    </>
                )}

                {school && <div>{school.numStudents + school.numTeachers}</div>}
                <div>{resultSize}</div>
            </div>

            <div className={"flex flex-row gap-8"}>
                {school && (
                    <div className={"flex flex-row gap-2"}>
                        <TeacherList
                            items={sortedTeachers.map(teacher => {
                                return {
                                    teacher,
                                }
                            })}
                        />

                        <div className={"flex flex-col w-fit gap-2"}>
                            <StudentsList
                                school={school}
                                items={(school?.students ?? []).map(
                                    studentId => {
                                        return {
                                            studentId,
                                        }
                                    },
                                )}
                            />
                        </div>
                    </div>
                )}

                {groupings && (
                    <Results groupings={groupings} school={school ?? null} />
                )}
            </div>
        </div>
    )
}

interface TeacherListItem {
    teacher: TeacherId
    onClick?: () => void
}

interface TeacherListProps {
    items: TeacherListItem[]
}

function TeacherList({ items }: TeacherListProps) {
    return (
        <ul className={"flex flex-col flex-wrap w-fit"}>
            {items.map(item => {
                return (
                    <li
                        key={item.teacher}
                        className={` gap-8 px-2 cursor-pointer odd:bg-emerald-100`}
                    >
                        {item.teacher}
                    </li>
                )
            })}
        </ul>
    )
}

interface StudentListItem {
    studentId: string
}

interface StudentsListProps {
    school: School
    items: StudentListItem[]
}

function StudentsList({ items }: StudentsListProps) {
    return (
        <ul className={"flex flex-col flex-wrap w-fit"}>
            {items.map(item => {
                return (
                    <div
                        key={item.studentId}
                        className={`px-2  even:bg-red-100 cursor-pointer`}
                    >
                        <li className={"col-span-4"}>{item.studentId}</li>
                    </div>
                )
            })}
        </ul>
    )
}

interface ResultsProps {
    groupings: Group[]
    school: School | null
}

function Results({ groupings, school }: ResultsProps) {
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherId>()
    const [selectedStudent, setSelectedStudent] = useState<StudentId>()

    function select(id: StudentId | TeacherId) {
        if (school?.isStudent(id)) {
            setSelectedTeacher(undefined)
            if (id === selectedStudent) setSelectedStudent(undefined)
            else setSelectedStudent(id)
        } else if (school?.isTeacher(id)) {
            setSelectedStudent(undefined)
            if (id === selectedTeacher) setSelectedTeacher(undefined)
            else setSelectedTeacher(id)
        }
    }
    return (
        <ul className={"text-sm  flex flex-col flex-wrap max-h-sm gap-2"}>
            {groupings.map((g, idx) => {
                return (
                    <div
                        key={g.join(",")}
                        className={
                            "flex flex-row items-center bg-violet-50 border-1 px-2"
                        }
                    >
                        <span className={"flex gap-0.5 items-baseline"}>
                            <span className={"font-bold"}>{idx + 1}</span>
                            <span className={"text-xs text-grey-50"}>
                                ({g.length})
                            </span>
                        </span>
                        <li className={"px-1 py-2 "}>
                            <ul className={"flex flex-row flex-wrap gap-2"}>
                                {g.map(member => {
                                    let classes = ""

                                    if (school?.isStudent(member)) {
                                        if (selectedStudent === member) {
                                            classes = "bg-red-200"
                                        } else if (
                                            selectedTeacher &&
                                            school.studentHasTeacher(
                                                member,
                                                selectedTeacher,
                                            )
                                        ) {
                                            classes += "bg-yellow-200"
                                        } else {
                                            classes += "bg-red-100"
                                        }
                                    } else if (school?.isTeacher(member)) {
                                        if (selectedTeacher === member) {
                                            classes = "bg-emerald-200"
                                        } else if (
                                            selectedStudent &&
                                            school?.studentHasTeacher(
                                                selectedStudent,
                                                member,
                                            )
                                        ) {
                                            classes += "bg-amber-200"
                                        } else {
                                            classes += "bg-emerald-100"
                                        }
                                    }

                                    return (
                                        <li
                                            key={member}
                                            onClick={() => select(member)}
                                            className={` cursor-pointer p-1 flex flex-row gap-1 text-xs ${classes}`}
                                        >
                                            <span>{member}</span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </li>
                    </div>
                )
            })}
        </ul>
    )
}

interface NiceButtonProps {
    onClick: () => void
    disabled?: boolean
}

function NiceButton({
    onClick,
    children,
    disabled,
}: PropsWithChildren<NiceButtonProps>) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="text-sm text-gray-200 bg-gray-800
             px-3 py-1.5 rounded-md font-medium
             hover:bg-gray-700 transition
             disabled:bg-gray-500
            "
        >
            {children}
        </button>
    )
}
