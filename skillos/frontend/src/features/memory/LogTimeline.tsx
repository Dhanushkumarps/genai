import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

interface Log {
    id: string
    content: string
    tags: string[]
    created_at: string
}

interface LogTimelineProps {
    logs: Log[]
    onSelect: (log: Log) => void
}

export default function LogTimeline({ logs, onSelect }: LogTimelineProps) {
    if (logs.length === 0) {
        return <div className="p-8 text-center text-muted-foreground text-sm">No memory logs found.</div>
    }

    // Group by Date
    const grouped = logs.reduce((acc, log) => {
        const date = format(new Date(log.created_at), 'yyyy-MM-dd')
        if (!acc[date]) acc[date] = []
        acc[date].push(log)
        return acc
    }, {} as Record<string, Log[]>)

    return (
        <div className="space-y-6 p-4">
            {Object.entries(grouped).map(([date, dayLogs]) => (
                <div key={date} className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                        {format(new Date(date), 'MMMM d, yyyy')}
                    </h4>
                    <div className="space-y-3">
                        {dayLogs.map(log => (
                            <div
                                key={log.id}
                                onClick={() => onSelect(log)}
                                className="group relative pl-4 border-l border-white/10 hover:border-primary/50 transition-colors cursor-pointer"
                            >
                                <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-background border border-white/20 group-hover:border-primary group-hover:bg-primary transition-colors" />
                                <p className="text-sm line-clamp-2 text-foreground/80 group-hover:text-foreground transition-colors font-mono">
                                    {log.content}
                                </p>
                                {log.tags && log.tags.length > 0 && (
                                    <div className="flex gap-2 mt-2">
                                        {log.tags.slice(0, 3).map(tag => (
                                            <Badge key={tag} variant="outline" className="text-[10px] py-0 h-4 border-primary/20 text-primary/70">#{tag}</Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
