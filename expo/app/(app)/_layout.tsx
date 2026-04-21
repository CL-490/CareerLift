import React from "react";
import { Drawer } from "expo-router/drawer";

import { AppDrawerContent } from "@/components/shell/AppDrawerContent";

export default function AppLayout() {
  return (
    <Drawer
      backBehavior="history"
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        overlayColor: "rgba(0,0,0,0.45)",
        drawerType: "slide",
        sceneStyle: {
          backgroundColor: "transparent",
        },
        swipeEdgeWidth: 80,
      }}
    >
      <Drawer.Screen name="index" options={{ drawerLabel: "Dashboard", title: "Dashboard" }} />
      <Drawer.Screen name="resume-lab" options={{ drawerLabel: "Resume Lab", title: "Resume Lab" }} />
      <Drawer.Screen name="job-finder" options={{ drawerLabel: "Job Finder", title: "Job Finder" }} />
      <Drawer.Screen name="applications" options={{ drawerLabel: "Applications", title: "Applications" }} />
      <Drawer.Screen name="coach-center" options={{ drawerLabel: "Coach Center", title: "Coach Center" }} />
      <Drawer.Screen name="settings" options={{ drawerLabel: "Settings", title: "Settings" }} />
      <Drawer.Screen name="resume-preview" options={{ drawerItemStyle: { display: "none" }, title: "Resume Preview" }} />
      <Drawer.Screen name="coach-interview" options={{ drawerItemStyle: { display: "none" }, title: "Mock Interview" }} />
    </Drawer>
  );
}
