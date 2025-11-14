import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { Shield, Users, Award, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const Landing = () => {
  const { data: recentReports } = useQuery({
    queryKey: ["recent-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_reports")
        .select(`
          *,
          reporter:profiles!reported_by (full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Pending
        </Badge>;
      case "verified_true":
        return <Badge variant="outline" className="bg-success/10 text-success border-success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified True
        </Badge>;
      case "verified_fake":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Fake News
        </Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container relative py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Shield className="h-4 w-4" />
              Decentralized News Verification
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Truth Matters. <br />
              <span className="text-primary">Verify Together.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join a community-driven platform to detect, verify, and combat fake news through crowdsourcing and trust-based moderation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg">
                <Link to="/auth/signup">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg">
                <Link to="/auth/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to combat misinformation
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="shadow-medium">
              <CardContent className="pt-6 space-y-4">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Report News</h3>
                <p className="text-muted-foreground">
                  Found suspicious news? Report it to the community for verification.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-medium">
              <CardContent className="pt-6 space-y-4">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Community Votes</h3>
                <p className="text-muted-foreground">
                  Community members verify the news and provide their verdict with evidence.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-medium">
              <CardContent className="pt-6 space-y-4">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Trust Score</h3>
                <p className="text-muted-foreground">
                  Earn trust points for accurate verifications. High scorers become moderators.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Recent Reports Section */}
      {recentReports && recentReports.length > 0 && (
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Recent Reports</h2>
              <p className="text-lg text-muted-foreground">
                See what the community is verifying
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentReports.map((report) => (
                <Card key={report.id} className="shadow-medium hover:shadow-strong transition-shadow">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-2">{report.title}</h3>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {report.content}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>By {report.reporter?.full_name}</span>
                      <span>{format(new Date(report.created_at), "MMM d")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button asChild variant="outline">
                <Link to="/auth/signup">Join to See More</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="container text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Fight Misinformation?
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Join thousands of truth-seekers working together to verify news and build trust.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-lg">
            <Link to="/auth/signup">Start Verifying Today</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;
