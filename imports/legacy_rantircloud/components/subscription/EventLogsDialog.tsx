import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { Eye, Download, RefreshCcw, Filter, Activity } from "lucide-react";
import { subscriptionService, AccessLog } from "@/services/subscriptionService";
import { format } from 'date-fns';
interface EventLogsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tableProjectId: string;
}
export function EventLogsDialog({
  isOpen,
  onClose,
  tableProjectId
}: EventLogsDialogProps) {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, tableProjectId]);
  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const data = await subscriptionService.getAccessLogs();
      setLogs(data);
    } catch (error: any) {
      toast.error("Failed to load access logs", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === "" || log.action.toLowerCase().includes(searchTerm.toLowerCase()) || log.user_agent?.toLowerCase().includes(searchTerm.toLowerCase()) || log.ip_address?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesStatus && matchesAction;
  });
  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileDefaultName = `access-logs-${format(new Date(), 'yyyy-MM-dd')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  const getStatusBadge = (status: string) => {
    const variants = {
      granted: "default",
      denied: "destructive",
      error: "secondary"
    } as const;
    return <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status}
      </Badge>;
  };
  const getActionIcon = (action: string) => {
    const iconMap = {
      'content_view': '👁️',
      'login': '🔑',
      'signup': '📝',
      'subscription_check': '💳',
      'api_access': '🔌'
    };
    return iconMap[action as keyof typeof iconMap] || '📋';
  };
  const uniqueActions = [...new Set(logs.map(log => log.action))];
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Event Logs & Analytics
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 px-[16px] py-[16px]">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{logs.length}</div>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {logs.filter(log => log.status === 'granted').length}
                </div>
                <p className="text-sm text-muted-foreground">Access Granted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">
                  {logs.filter(log => log.status === 'denied').length}
                </div>
                <p className="text-sm text-muted-foreground">Access Denied</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {logs.filter(log => log.status === 'error').length}
                </div>
                <p className="text-sm text-muted-foreground">Errors</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Label>Search</Label>
                  <Input placeholder="Search logs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="granted">Granted</SelectItem>
                      <SelectItem value="denied">Denied</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Action</Label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      {uniqueActions.map(action => <SelectItem key={action} value={action}>
                          {action}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={loadLogs} disabled={isLoading}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={exportLogs}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Event Logs ({filteredLogs.length} of {logs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="text-center py-8">Loading logs...</div> : filteredLogs.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                  No logs found matching your filters.
                </div> : <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map(log => <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{getActionIcon(log.action)}</span>
                              <span className="text-sm">{log.action}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(log.status)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.user_id ? log.user_id.slice(0, 8) + '...' : 'Anonymous'}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {log.ip_address || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {log.metadata && Object.keys(log.metadata).length > 0 && <Button variant="ghost" size="sm" onClick={() => {
                        const details = JSON.stringify(log.metadata, null, 2);
                        alert(`Log Details:\n\n${details}`);
                      }}>
                                <Eye className="h-4 w-4" />
                              </Button>}
                          </TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                </div>}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>;
}