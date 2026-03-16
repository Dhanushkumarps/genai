import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Bot, Flame } from 'lucide-react'

interface AddTaskModalProps {
    isOpen: boolean
    onClose: () => void
    onAdd: (title: string, description: string, difficulty: number) => Promise<void>
}

export default function AddTaskModal({ isOpen, onClose, onAdd }: AddTaskModalProps) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [difficulty, setDifficulty] = useState([5]) // Slider expects array
    const [isLoading, setIsLoading] = useState(false)

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            setTitle('')
            setDescription('')
            setDifficulty([5])
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        try {
            setIsLoading(true)
            await onAdd(title, description, difficulty[0])
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md border-primary/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black/80 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl glitch-effect" data-text="New Mission">New Mission</DialogTitle>
                    <DialogDescription className="font-mono text-xs uppercase tracking-widest text-primary/60">
                        Initialize New Protocol
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-muted-foreground">Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Hack the Mainframe"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="bg-secondary/10 border-white/10 focus-visible:ring-primary/50"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-muted-foreground">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Protocol parameters..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-secondary/10 border-white/10 min-h-[100px] resize-none focus-visible:ring-primary/50"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-muted-foreground">Difficulty Level</Label>
                            <span className={`text-xs font-bold px-2 py-1 rounded bg-secondary/20 ${difficulty[0] > 7 ? 'text-destructive' : difficulty[0] > 4 ? 'text-warning' : 'text-success'
                                }`}>
                                {difficulty[0]}/10
                            </span>
                        </div>
                        <Slider
                            value={difficulty}
                            onValueChange={setDifficulty}
                            max={10}
                            step={1}
                            className="py-2"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground px-1 font-mono uppercase">
                            <span>Trivia</span>
                            <span>Nightmare</span>
                        </div>
                    </div>

                    {/* AI Suggestion Mock */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <Bot className="w-5 h-5 text-primary mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="text-primary font-bold block mb-1">AI Recommendation:</span>
                            Based on current system load (Optimized), you have capacity for a high-difficulty task.
                        </p>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="neon"
                            disabled={isLoading}
                            className="w-full sm:w-auto"
                        >
                            {isLoading ? 'Processing...' : 'Initialize Task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
