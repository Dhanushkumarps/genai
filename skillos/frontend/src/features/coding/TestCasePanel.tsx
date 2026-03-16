import { useState, useEffect } from 'react'
import type { FC } from 'react'
import { CheckCircle2, XCircle, Code2, TerminalSquare } from 'lucide-react'

interface TestCase {
    input: string
    expectedOutput: string
}

interface TestResult {
    input: string
    expectedOutput: string
    actualOutput: string
    passed: boolean
}

interface TestCasePanelProps {
    testCases: TestCase[]
    results?: TestResult[] | null
}

export const TestCasePanel: FC<TestCasePanelProps> = ({ testCases, results }) => {
    const [activeTab, setActiveTab] = useState(0)

    // Reset active tab if it exceeds bounds (e.g. new problem loads)
    useEffect(() => {
        if (activeTab >= testCases.length) {
            setActiveTab(0)
        }
    }, [testCases, activeTab])

    if (!testCases || testCases.length === 0) return null

    const currentCase = testCases[activeTab]
    const currentResult = results ? results[activeTab] : null

    return (
        <div className="bg-[#1A1D20] border border-[#242424] rounded-xl overflow-hidden flex flex-col min-h-[250px] max-h-[300px]">
            {/* Tabs Header */}
            <div className="flex items-center px-2 bg-[#121417] border-b border-[#242424] overflow-x-auto no-scrollbar">
                <div className="flex items-center px-3 py-2 text-xs font-semibold text-[#6B6966] border-r border-[#242424] mr-2">
                    <TerminalSquare className="w-4 h-4 mr-1.5" />
                    Test Cases
                </div>

                {testCases.map((_, i) => {
                    const res = results ? results[i] : null
                    const statusColor = res ? (res.passed ? 'bg-[#30e8bd]' : 'bg-[#f04848]') : 'bg-transparent'

                    return (
                        <button
                            key={i}
                            onClick={() => setActiveTab(i)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                                ${activeTab === i
                                    ? 'border-[#30e8bd] text-[#E8E6E3] bg-[#22262A]'
                                    : 'border-transparent text-[#6B6966] hover:text-[#9A9996] hover:bg-[#1A1D20]'
                                }`}
                        >
                            {res && <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />}
                            Case {i + 1}
                        </button>
                    )
                })}
            </div>

            {/* Test Case Content */}
            <div className="p-4 overflow-y-auto flex-1 bg-[#1A1D20]">
                {/* Result header if executed */}
                {results && currentResult && (
                    <div className="mb-4 flex items-center gap-2">
                        <span className={`text-sm font-bold flex items-center gap-1.5 ${currentResult.passed ? 'text-[#30e8bd]' : 'text-[#f04848]'}`}>
                            {currentResult.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {currentResult.passed ? 'Accepted' : 'Wrong Answer'}
                        </span>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <div className="text-xs text-[#6B6966] mb-1.5 font-medium">Input =</div>
                        <div className="bg-[#0a0a0a] rounded-lg p-3 font-mono text-sm text-[#E8E6E3] border border-[#242424]">
                            {currentCase.input}
                        </div>
                    </div>

                    {!currentResult && (
                        <div>
                            <div className="text-xs text-[#6B6966] mb-1.5 font-medium">Expected =</div>
                            <div className="bg-[#0a0a0a] rounded-lg p-3 font-mono text-sm text-[#E8E6E3] border border-[#242424]">
                                {currentCase.expectedOutput}
                            </div>
                        </div>
                    )}

                    {currentResult && (
                        <>
                            <div>
                                <div className="text-xs text-[#6B6966] mb-1.5 font-medium">Output =</div>
                                <div className={`bg-[#0a0a0a] rounded-lg p-3 font-mono text-sm border whitespace-pre-wrap ${currentResult.passed ? 'border-[#30e8bd]/20 text-[#E8E6E3]' : 'border-[#f04848]/20 text-[#f04848]'}`}>
                                    {currentResult.actualOutput}
                                </div>
                            </div>

                            {!currentResult.passed && (
                                <div>
                                    <div className="text-xs text-[#6B6966] mb-1.5 font-medium">Expected =</div>
                                    <div className="bg-[#0a0a0a] rounded-lg p-3 font-mono text-sm text-[#30e8bd] border border-[#30e8bd]/20 whitespace-pre-wrap">
                                        {currentCase.expectedOutput}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
