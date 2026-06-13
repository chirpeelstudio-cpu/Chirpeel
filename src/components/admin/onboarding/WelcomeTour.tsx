// Back-compat shim — the original centered-dialog tour was replaced by
// SidebarSpotlightTour. AboutPanel still imports replayWelcomeTour from here.
export { replayWelcomeTour, useWelcomeTour, markTourComplete } from "./tourState";
