import React from "react";
import { Composition } from "remotion";
import { loadFont as loadDM } from "@remotion/google-fonts/DMSans";
import { Pipeline } from "./scenes/Pipeline";
import { Quotation } from "./scenes/Quotation";
import { Projects } from "./scenes/Projects";
import { Vendors } from "./scenes/Vendors";
import { Finance } from "./scenes/Finance";
import { ClientPortal } from "./scenes/ClientPortal";

loadDM("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });

const COMMON = { durationInFrames: 150, fps: 30, width: 1280, height: 720 };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="pipeline"     component={Pipeline}     {...COMMON} />
    <Composition id="quotation"    component={Quotation}    {...COMMON} />
    <Composition id="projects"     component={Projects}     {...COMMON} />
    <Composition id="vendors"      component={Vendors}      {...COMMON} />
    <Composition id="finance"      component={Finance}      {...COMMON} />
    <Composition id="clientportal" component={ClientPortal} {...COMMON} />
  </>
);
