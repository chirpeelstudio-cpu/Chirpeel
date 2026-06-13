import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Receipt } from "lucide-react";
import { VendorsList } from "./VendorsList";
import { PurchaseOrdersList } from "./PurchaseOrdersList";

export default function VendorsModule() {
  return (
    <Tabs defaultValue="directory" className="space-y-4">
      <div className="-mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto scrollbar-none">
        <TabsList data-tour-id="vendors-tabs" className="inline-flex w-max">
          <TabsTrigger value="directory" className="flex items-center gap-1.5">
            <Truck className="w-4 h-4" /> Directory
          </TabsTrigger>
          <TabsTrigger value="pos" className="flex items-center gap-1.5">
            <Receipt className="w-4 h-4" /> Purchase Orders
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="directory"><VendorsList /></TabsContent>
      <TabsContent value="pos"><PurchaseOrdersList /></TabsContent>
    </Tabs>
  );
}
