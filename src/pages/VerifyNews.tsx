import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const VerifyNews = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [verdict, setVerdict] = useState<"true" | "fake" | null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth/login");
    }
  }, [user, loading, navigate]);

  const { data: pendingReports } = useQuery({
    queryKey: ["pending-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_reports")
        .select(`
          *,
          reporter:profiles!reported_by (full_name),
          verifications (id, verdict, verified_by)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitVerification = useMutation({
    mutationFn: async () => {
      if (!user || !selectedReport || !verdict) return;

      const { error } = await supabase.from("verifications").insert({
        news_id: selectedReport.id,
        verified_by: user.id,
        verdict,
        comment,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Verification submitted!",
        description: "Your verdict has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-reports"] });
      setSelectedReport(null);
      setVerdict(null);
      setComment("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasUserVerified = (report: any) => {
    return report.verifications?.some((v: any) => v.verified_by === user?.id);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Verify News Reports</h1>
          <p className="text-muted-foreground">
            Help the community by verifying pending reports
          </p>
        </div>

        {!selectedReport ? (
          <div className="grid md:grid-cols-2 gap-6">
            {pendingReports && pendingReports.length > 0 ? (
              pendingReports.map((report) => {
                const userVerified = hasUserVerified(report);
                const verificationCount = report.verifications?.length || 0;

                return (
                  <Card
                    key={report.id}
                    className={`shadow-medium ${userVerified ? "opacity-60" : "hover:shadow-strong transition-shadow cursor-pointer"}`}
                    onClick={() => !userVerified && setSelectedReport(report)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2">{report.title}</CardTitle>
                        {report.suspicion_score > 50 && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
                            High Risk
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {report.content}
                      </p>
                      {report.image_url && (
                        <img
                          src={report.image_url}
                          alt="Report"
                          className="rounded-lg w-full h-48 object-cover"
                        />
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          By {report.reporter?.full_name}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(report.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {verificationCount} verification{verificationCount !== 1 ? "s" : ""}
                        </span>
                        {userVerified ? (
                          <Badge variant="secondary">Already Verified</Badge>
                        ) : (
                          <Button size="sm">Verify This</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-2 text-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">
                  No pending reports to verify at the moment.
                </p>
              </div>
            )}
          </div>
        ) : (
          <Card className="max-w-3xl mx-auto shadow-strong">
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
                  <p className="text-xs text-muted-foreground mt-1">
                    This report contains patterns commonly found in fake news
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3">Your Verdict</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant={verdict === "true" ? "default" : "outline"}
                    className={verdict === "true" ? "bg-success hover:bg-success/90" : ""}
                    onClick={() => setVerdict("true")}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    This is True
                  </Button>
                  <Button
                    variant={verdict === "fake" ? "default" : "outline"}
                    className={verdict === "fake" ? "bg-destructive hover:bg-destructive/90" : ""}
                    onClick={() => setVerdict("fake")}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    This is Fake
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Add Comment (optional)</h3>
                <Textarea
                  placeholder="Explain your reasoning..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => submitVerification.mutate()}
                  disabled={!verdict || submitVerification.isPending}
                  className="flex-1"
                >
                  {submitVerification.isPending ? "Submitting..." : "Submit Verification"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedReport(null);
                    setVerdict(null);
                    setComment("");
                  }}
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

export default VerifyNews;
