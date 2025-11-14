import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const Moderate = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "moderator")) {
      navigate("/dashboard");
      toast({
        title: "Access Denied",
        description: "You must be a moderator to access this page.",
        variant: "destructive",
      });
    }
  }, [user, profile, loading, navigate]);

  const { data: pendingReports } = useQuery({
    queryKey: ["pending-reports-moderate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_reports")
        .select(`
          *,
          reporter:profiles!reported_by (full_name),
          verifications (verdict, comment, verified_by, profiles!verified_by (full_name))
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && profile?.role === "moderator",
  });

  const finalizeReport = useMutation({
    mutationFn: async ({ reportId, finalVerdict }: { reportId: string; finalVerdict: "true" | "fake" }) => {
      if (!user) return;

      // Update report status
      const { error: updateError } = await supabase
        .from("news_reports")
        .update({
          status: finalVerdict === "true" ? "verified_true" : "verified_fake",
          final_verdict: finalVerdict,
          finalized_at: new Date().toISOString(),
          finalized_by: user.id,
        })
        .eq("id", reportId);

      if (updateError) throw updateError;

      // Update trust scores via edge function
      const { error: functionError } = await supabase.functions.invoke("update-trust-scores", {
        body: { reportId, finalVerdict },
      });

      if (functionError) throw functionError;
    },
    onSuccess: () => {
      toast({
        title: "Report finalized!",
        description: "Trust scores have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-reports-moderate"] });
      setSelectedReport(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getVerdictStats = (verifications: any[]) => {
    const trueCount = verifications.filter((v) => v.verdict === "true").length;
    const fakeCount = verifications.filter((v) => v.verdict === "fake").length;
    return { trueCount, fakeCount, total: verifications.length };
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-primary">Moderator Panel</Badge>
          </div>
          <h1 className="text-3xl font-bold">Finalize Reports</h1>
          <p className="text-muted-foreground">
            Review community verifications and make final decisions
          </p>
        </div>

        {!selectedReport ? (
          <div className="grid md:grid-cols-2 gap-6">
            {pendingReports && pendingReports.length > 0 ? (
              pendingReports.map((report) => {
                const stats = getVerdictStats(report.verifications || []);

                return (
                  <Card
                    key={report.id}
                    className="shadow-medium hover:shadow-strong transition-shadow cursor-pointer"
                    onClick={() => setSelectedReport(report)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-2">{report.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {report.content}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          By {report.reporter?.full_name}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(report.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Community Verdict:</span>
                          <span className="font-medium">{stats.total} votes</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="bg-success/10 text-success">
                            True: {stats.trueCount}
                          </Badge>
                          <Badge variant="outline" className="bg-destructive/10 text-destructive">
                            Fake: {stats.fakeCount}
                          </Badge>
                        </div>
                      </div>
                      <Button className="w-full">Review & Finalize</Button>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-2 text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">
                  No pending reports to finalize at the moment.
                </p>
              </div>
            )}
          </div>
        ) : (
          <Card className="max-w-4xl mx-auto shadow-strong">
            <CardHeader>
              <CardTitle className="text-2xl">{selectedReport.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Reported by {selectedReport.reporter?.full_name} on{" "}
                {format(new Date(selectedReport.created_at), "MMMM d, yyyy")}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{selectedReport.content}</p>
              </div>

              {selectedReport.image_url && (
                <div>
                  <h3 className="font-semibold mb-2">Image</h3>
                  <img
                    src={selectedReport.image_url}
                    alt="Report"
                    className="rounded-lg w-full max-h-96 object-cover"
                  />
                </div>
              )}

              {selectedReport.suspicion_score > 0 && (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-warning">
                    AI Suspicion Score: {selectedReport.suspicion_score}/100
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3">Community Verifications</h3>
                {selectedReport.verifications && selectedReport.verifications.length > 0 ? (
                  <div className="space-y-3">
                    {selectedReport.verifications.map((verification: any, index: number) => (
                      <div key={index} className="p-4 rounded-lg border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{verification.profiles?.full_name}</span>
                          <Badge
                            variant={verification.verdict === "true" ? "default" : "destructive"}
                            className={verification.verdict === "true" ? "bg-success" : ""}
                          >
                            {verification.verdict === "true" ? "TRUE" : "FAKE"}
                          </Badge>
                        </div>
                        {verification.comment && (
                          <p className="text-sm text-muted-foreground">{verification.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No verifications yet
                  </p>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Final Decision</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    size="lg"
                    className="bg-success hover:bg-success/90"
                    onClick={() =>
                      finalizeReport.mutate({
                        reportId: selectedReport.id,
                        finalVerdict: "true",
                      })
                    }
                    disabled={finalizeReport.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Mark as TRUE
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={() =>
                      finalizeReport.mutate({
                        reportId: selectedReport.id,
                        finalVerdict: "fake",
                      })
                    }
                    disabled={finalizeReport.isPending}
                  >
                    <XCircle className="mr-2 h-5 w-5" />
                    Mark as FAKE
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setSelectedReport(null)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Moderate;
