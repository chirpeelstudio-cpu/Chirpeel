import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, Send, Inbox } from "lucide-react";
import ChannelsPanel from "./ChannelsPanel";
import CampaignsPanel from "./CampaignsPanel";
import InboundLeadsPanel from "./InboundLeadsPanel";

export default function MarketingModule() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Digital Marketing</h2>
        <p className="text-xs text-muted-foreground">
          Connect Meta, Google Ads, and WhatsApp so leads flow into your pipeline — and run bulk WhatsApp campaigns.
        </p>
      </div>

      <Tabs defaultValue="channels" className="space-y-4">
        <div className="-mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto scrollbar-none">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="channels" className="flex items-center gap-1.5">
              <Link2 className="w-4 h-4" /> Channels
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-1.5">
              <Send className="w-4 h-4" /> Campaigns
            </TabsTrigger>
            <TabsTrigger value="inbox" className="flex items-center gap-1.5">
              <Inbox className="w-4 h-4" /> Lead inbox
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="channels"><ChannelsPanel /></TabsContent>
        <TabsContent value="campaigns"><CampaignsPanel /></TabsContent>
        <TabsContent value="inbox"><InboundLeadsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}