import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flag, AlertTriangle } from 'lucide-react';

export const ModeratorFlagged = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Flag className="w-6 h-6 text-yellow-400" />
          Flagged Content
        </h1>
        <p className="text-muted-foreground">Review items flagged by users or the system</p>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="p-12 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Flagged Content</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            When users report content or the system detects potential issues, 
            they will appear here for your review.
          </p>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flag className="w-4 h-4 text-yellow-400" />
              User Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Content reported by users for violations of community guidelines.
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              System Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Automatically flagged content based on pattern detection.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};