import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, TrendingUp, Award, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth/login");
    }
  }, [user, loading, navigate]);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [reportsResult, verificationsResult, leaderboardResult] = await Promise.all([
        supabase.from("news_reports").select("*", { count: "exact", head: true }),
        supabase.from("verifications").select("*", { count: "exact", head: true }).eq("verified_by", user.id),
        supabase.from("profiles").select("full_name, trust_score").order("trust_score", { ascending: false }).limit(5),
      ]);

      return {
        totalReports: reportsResult.count || 0,
        myVerifications: verificationsResult.count || 0,
        leaderboard: leaderboardResult.data || [],
      };
    },
    enabled: !!user?.id,
  });

  const { data: myReports } = useQuery({
    queryKey: ["my-reports", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("news_reports")
        .select("*")
        .eq("reported_by", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.full_name}!
          </h1>
          <p className="text-muted-foreground">
            Your trust score: <span className="font-semibold text-foreground">{profile?.trust_score || 0}</span>
            {profile?.role === "moderator" && (
              <Badge className="ml-2 bg-primary">Moderator</Badge>
            )}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalReports || 0}</div>
            </CardContent>
          </Card>
          <Card className="shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">My Verifications</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.myVerifications || 0}</div>
            </CardContent>
          </Card>
          <Card className="shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile?.trust_score || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8 shadow-medium">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>What would you like to do?</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button asChild>
              <Link to="/report">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Report News
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/verify">
                <Shield className="mr-2 h-4 w-4" />
                Verify Reports
              </Link>
            </Button>
            {profile?.role === "moderator" && (
              <Button asChild variant="secondary">
                <Link to="/moderate">
                  <Award className="mr-2 h-4 w-4" />
                  Moderate
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* My Recent Reports */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>My Recent Reports</CardTitle>
              <CardDescription>Reports you've submitted</CardDescription>
            </CardHeader>
            <CardContent>
              {myReports && myReports.length > 0 ? (
                <div className="space-y-4">
                  {myReports.map((report) => (
                    <div key={report.id} className="flex items-start gap-4 p-3 rounded-lg border">
                      <div className="flex-1 space-y-1">
                        <p className="font-medium line-clamp-1">{report.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {report.content}
                        </p>
                      </div>
                      <Badge variant={report.status === "pending" ? "outline" : "default"}>
                        {report.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No reports yet. Start by reporting suspicious news!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Verifiers
              </CardTitle>
              <CardDescription>Community leaderboard</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.leaderboard && stats.leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {stats.leaderboard.map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-lg text-muted-foreground">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{user.trust_score} pts</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Be the first on the leaderboard!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
