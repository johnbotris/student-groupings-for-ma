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

export default function App() {
    const [school, setSchool] = useLocalStorage<School | null>("school", null, {
        serialization: {
            serialize: School.serialize,
            deserialize: School.deserialize,
        },
    })

    const [groupings, setGroupings] = useLocalStorage<Group[]>(
        "groupings-results",
        [],
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

    const resultSize = groupings?.flat().length ?? 0

    const createGroups = useCallback(() => {
        if (!school) return
        console.log("grouping with ", teachersPerGroup)
        setGroupings(createGroupings(school, { teachersPerGroup }))
    }, [createGroupings, school, setGroupings, teachersPerGroup])

    async function openClassList() {
        const file = await openFile()
        const { pairings } = parseStudentWorkbook(file)
        setSchool(School.create(pairings))
    }

    async function openExistingResults() {
        const file = await openFile()
        setGroupings(parseExistingResults(file) as Group[])
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

    function moveGroupMember(
        member: StudentId | TeacherId,
        from: number,
        to: number,
    ) {
        if (from === to) return

        setGroupings(groups =>
            groups.map((group, groupIdx) => {
                if (groupIdx === from) {
                    return group.filter(m => m !== member)
                } else if (groupIdx === to) {
                    return [...group, member]
                } else {
                    return group
                }
            }),
        )
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
                    <Results
                        groupings={groupings}
                        school={school ?? null}
                        moveMember={moveGroupMember}
                    />
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
    moveMember: (
        s: TeacherId | StudentId,
        fromGroupIdx: number,
        toGroupIdx: number,
    ) => void
}

function Results({ groupings, school, moveMember }: ResultsProps) {
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherId>()
    const [selectedStudent, setSelectedStudent] = useState<StudentId>()

    const sortedGroupings = groupings.map(grouping =>
        grouping
            .toSorted()
            .toSorted(member => (school?.isTeacher(member) ? -1 : 1)),
    )

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
            {sortedGroupings.map((group, groupIdx) => {
                return (
                    <div
                        onDragOver={ev => ev.preventDefault()}
                        onDrop={ev => {
                            moveMember(
                                ev.dataTransfer.getData("member") as
                                    | StudentId
                                    | TeacherId,
                                Number(ev.dataTransfer.getData("from")),
                                groupIdx,
                            )
                        }}
                        key={group.join(",")}
                        className={
                            "flex flex-row items-center bg-violet-50 border-1 px-2"
                        }
                    >
                        <span className={"flex gap-0.5 items-baseline"}>
                            <span className={"font-bold"}>{groupIdx + 1}</span>
                            <span className={"text-xs text-grey-50"}>
                                ({group.length})
                            </span>
                        </span>
                        <li className={"px-1 py-2 "}>
                            <ul className={"flex flex-row flex-wrap gap-2"}>
                                {group.map(member => {
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
                                            onDragStart={ev => {
                                                ev.dataTransfer.effectAllowed =
                                                    "move"

                                                ev.dataTransfer.setData(
                                                    "from",
                                                    String(groupIdx),
                                                )

                                                ev.dataTransfer.setData(
                                                    "member",
                                                    member,
                                                )
                                            }}
                                            draggable
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
