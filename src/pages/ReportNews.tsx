import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

const ReportNews = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    imageUrl: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth/login");
    }
  }, [user, loading, navigate]);

  const calculateSuspicionScore = (title: string, content: string): number => {
    let score = 0;
    const text = `${title} ${content}`.toLowerCase();

    // Spam words check
    const spamWords = ["click here", "amazing", "shocking", "unbelievable", "miracle", "secret"];
    spamWords.forEach((word) => {
      if (text.includes(word)) score += 10;
    });

    // Excessive punctuation/caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.3) score += 15;

    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 3) score += 10;

    return Math.min(score, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const suspicionScore = calculateSuspicionScore(formData.title, formData.content);

      const { error } = await supabase.from("news_reports").insert({
        title: formData.title,
        content: formData.content,
        image_url: formData.imageUrl || null,
        reported_by: user.id,
        suspicion_score: suspicionScore,
      });

      if (error) throw error;

      toast({
        title: "Report submitted!",
        description: `Your report has been submitted for verification. Suspicion score: ${suspicionScore}`,
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-2xl">
        <Card className="shadow-strong">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-full bg-warning/10 p-2">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <CardTitle className="text-2xl">Report Suspicious News</CardTitle>
                <CardDescription>
                  Help the community by reporting potentially fake news
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">News Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter the news headline..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Description *</Label>
                <Textarea
                  id="content"
                  placeholder="Describe the news and why you think it might be fake..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  rows={6}
                  maxLength={2000}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (optional)</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">How it works:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Your report will be reviewed by the community</li>
                  <li>• Other users will verify if the news is true or fake</li>
                  <li>• AI assists in detecting suspicious patterns</li>
                  <li>• Moderators finalize the verdict</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportNews;
