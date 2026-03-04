import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Users } from "lucide-react";
import type { Membership } from "@shared/schema";

export default function Paddock() {
  const { user } = useAuth();
  const { data: memberships, isLoading } = useQuery<Membership[]>({
    queryKey: ["/api/me"],
    select: (data: any) => data.memberships,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Paddock</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {memberships?.map((membership) => (
          <Link key={membership.lobbyId} href={`/lobby/${membership.lobbyId}`}>
            <Card className="hover:border-primary cursor-pointer transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold">{membership.lobbyName}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
                  Code: {membership.lobbyCode}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Team:</span>
                  <span className="font-medium">{membership.teamName}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-muted-foreground">Role:</span>
                  <span className="capitalize font-medium">{membership.role}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-muted-foreground">Jollies:</span>
                  <span className="font-medium">{membership.jolliesRemaining}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        
        {memberships?.length === 0 && (
          <div className="col-span-full text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground mb-4">You haven't joined any lobbies yet.</p>
            <Link href="/" className="text-primary hover:underline">
              Go to Dashboard to create or join a league
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
