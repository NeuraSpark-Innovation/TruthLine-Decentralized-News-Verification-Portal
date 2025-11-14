import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, FileText, CheckCircle2, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const Profile = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth/login");
    }
  }, [user, loading, navigate]);

  const { data: userStats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [reportsResult, verificationsResult] = await Promise.all([
        supabase
          .from("news_reports")
          .select("*")
          .eq("reported_by", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("verifications")
          .select("*, news_reports (title, status)")
          .eq("verified_by", user.id)
          .order("created_at", { ascending: false }),
      ]);

      return {
        reports: reportsResult.data || [],
        verifications: verificationsResult.data || [],
      };
    },
    enabled: !!user?.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning">Pending</Badge>;
      case "verified_true":
        return <Badge variant="outline" className="bg-success/10 text-success border-success">Verified True</Badge>;
      case "verified_fake":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">Fake</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        {/* Profile Header */}
        <Card className="mb-8 shadow-strong">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">{profile?.full_name}</h1>
                <p className="text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-2">
                  {profile?.role === "moderator" && (
                    <Badge className="bg-primary">Moderator</Badge>
                  )}
                  <Badge variant="secondary">
                    Member since {format(new Date(user?.created_at || ""), "MMMM yyyy")}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Trust Score</span>
                </div>
                <p className="text-4xl font-bold text-primary">{profile?.trust_score || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.reports.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Verifications</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.verifications.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* My Reports */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>My Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {userStats?.reports && userStats.reports.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {userStats.reports.map((report) => (
                    <div key={report.id} className="p-4 rounded-lg border space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium line-clamp-2">{report.title}</h4>
                        {getStatusBadge(report.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(report.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No reports yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* My Verifications */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>My Verifications</CardTitle>
            </CardHeader>
            <CardContent>
              {userStats?.verifications && userStats.verifications.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {userStats.verifications.map((verification) => (
                    <div key={verification.id} className="p-4 rounded-lg border space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium line-clamp-2">
                          {verification.news_reports?.title}
                        </h4>
                        <Badge variant={verification.verdict === "true" ? "default" : "destructive"}>
                          {verification.verdict}
                        </Badge>
                      </div>
                      {verification.comment && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {verification.comment}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(verification.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No verifications yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progress to Moderator */}
        {profile?.role === "user" && (
          <Card className="mt-6 shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Path to Moderator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Trust Score Progress</span>
                  <span className="font-medium">{profile?.trust_score || 0} / 25</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(((profile?.trust_score || 0) / 25) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Reach 25 trust points to become a moderator and help finalize verdicts!
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Profile;
