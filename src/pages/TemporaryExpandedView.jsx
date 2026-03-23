import React from "react";
import TemporaryRoomDetails from "./TemporaryRoomDetails";

export default function TemporaryExpandedView(props) {
  return (
    <div className="temporary-expanded-view gprofile-page gprofile-panel--docked">
      <TemporaryRoomDetails {...props} />
    </div>
  );
}
