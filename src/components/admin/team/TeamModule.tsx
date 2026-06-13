import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, History, UserCog, Clock } from "lucide-react";
import TeamManagement from "../TeamManagement";
import Leaderboard from "./Leaderboard";
import ActivityLog from "./ActivityLog";
import WorkingHoursCard from "./WorkingHoursCard";

export default function TeamModule() {
  return (
    <Tabs defaultValue="leaderboard" className="space-y-4">
      <TabsList data-tour-id="team-tabs">
        <TabsTrigger value="leaderboard"><Trophy className="w-4 h-4 mr-1.5" />Leaderboard</TabsTrigger>
        <TabsTrigger value="activity"><History className="w-4 h-4 mr-1.5" />Activity</TabsTrigger>
        <TabsTrigger value="members"><UserCog className="w-4 h-4 mr-1.5" />Members</TabsTrigger>
        <TabsTrigger value="hours"><Clock className="w-4 h-4 mr-1.5" />My Hours</TabsTrigger>
      </TabsList>
      <TabsContent value="leaderboard"><Leaderboard /></TabsContent>
      <TabsContent value="activity"><ActivityLog /></TabsContent>
      <TabsContent value="members"><TeamManagement /></TabsContent>
      <TabsContent value="hours"><WorkingHoursCard /></TabsContent>
    </Tabs>
  );
}
