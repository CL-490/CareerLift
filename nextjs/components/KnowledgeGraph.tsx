"use client";

import React, { useEffect, useRef } from "react";
// Import from the standalone entrypoint which is widely supported by bundlers and Turbopack
import { DataSet, Network } from "vis-network/standalone";
import type { Node as VNode, Edge as VEdge } from "vis-network";
import "vis-network/styles/vis-network.css";

// Types
interface GraphData {
  person: {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
  };
  skills: Array<string>;
  experiences: Array<{
    title: string;
    company?: string;
    duration?: string;
    description?: string;
  }>;
  education: Array<{
    degree: string;
    institution?: string;
    year?: string;
  }>;
}

interface Props {
  graphData?: GraphData | null;
  personName?: string;
  apiUrl?: string;
}

export default function KnowledgeGraph({ graphData, personName, apiUrl = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined) || "http://localhost:8000" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<Network | null>(null);

  // Build nodes/edges from the data
  const buildGraph = (d: GraphData) => {
    const nodes: VNode[] = [];
    const edges: VEdge[] = [];

    // Person node
    const personId = `person:${d.person.name}`;
    nodes.push({ id: personId, label: d.person.name, group: "person", title: `Person: ${d.person.name}` });

    // Skills
    d.skills.forEach((skill, idx) => {
      const sid = `skill:${skill}`;
      nodes.push({ id: sid, label: skill, group: "skill", title: `Skill: ${skill}` });
      edges.push({ from: personId, to: sid, label: "HAS_SKILL", arrows: "to" });
    });

    // Experiences
    d.experiences.forEach((exp, idx) => {
      const eid = `exp:${idx}`;
      const label = exp.company ? `${exp.title} @ ${exp.company}` : exp.title;
      const title = `${exp.title}${exp.company ? ` @ ${exp.company}` : ""}${exp.description ? `\n\n${exp.description}` : ""}`;
      nodes.push({ id: eid, label, group: "experience", title });
      edges.push({ from: personId, to: eid, label: "HAS_EXPERIENCE", arrows: "to" });
    });

    // Education
    d.education.forEach((edu, idx) => {
      const gid = `edu:${idx}`;
      const label = edu.degree || edu.institution || "Education";
      const title = `${edu.degree ? edu.degree + " — " : ""}${edu.institution || ""}${edu.year ? `\n${edu.year}` : ""}`;
      nodes.push({ id: gid, label, group: "education", title });
      edges.push({ from: personId, to: gid, label: "HAS_EDUCATION", arrows: "to" });
    });

    return { nodes, edges };
  };

  const createNetwork = (nodes: VNode[], edges: VEdge[]) => {
    const container = containerRef.current;
    if (!container) return;

    const data = {
      nodes: new DataSet(nodes as any),
      edges: new DataSet(edges as any),
    };

    const options = {
      autoResize: true,
      height: "600px",
      edges: {
        arrows: {
          to: { enabled: true, type: "arrow" }
        },
        color: {
          color: "rgba(255,255,255,0.4)",
          highlight: "rgba(255,255,255,0.8)"
        },
        font: { color: "#ddd", align: "top" }
      },
      layout: {
        improvedLayout: true,
      },
      physics: {
        stabilization: false,
        barnesHut: { gravitationalConstant: -20000, springLength: 200 },
      },
      nodes: {
        shape: "dot",
        size: 18,
        font: { color: "#ffffff" },
        borderWidth: 2
      },
      groups: {
        person: { color: { background: "#1f2937", border: "#60a5fa" }, shape: "dot" },
        skill: { color: { background: "#0ea5e9", border: "#0369a1" } },
        experience: { color: { background: "#34d399", border: "#065f46" } },
        education: { color: { background: "#f472b6", border: "#831843" } }
      }
    };

    networkRef.current = new Network(container, data as any, options);

    networkRef.current.on("click", function (params) {
      if (params.nodes && params.nodes.length > 0) {
        const clicked = params.nodes[0];
        // Optionally: open a details panel
        // We'll display a simple native tooltip via title on nodes
      }
    });
  };

  useEffect(() => {
    let mounted = true;

    const fetchAndRender = async (pn?: string) => {
      try {
        if (!pn && !graphData) return;
        let gdata = graphData;
        if (!gdata) {
          // Fetch from API
          const url = `${apiUrl}/api/resume/graph/${encodeURIComponent(pn || "Unknown")}`;
          const res = await fetch(url);
          if (!res.ok) {
            // nothing
            return;
          }
          const json = await res.json();
          gdata = json;
        }
        if (!mounted || !gdata) return;
        const { nodes, edges } = buildGraph(gdata);
        createNetwork(nodes, edges);
      } catch (e) {
        // Ignore
      }
    };

    fetchAndRender(personName);

    return () => {
      mounted = false;
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [graphData, personName]);

  return (
    <div className="mt-4">
      <div ref={containerRef} style={{ width: "100%", height: "600px", background: "transparent", borderRadius: 8 }} />
    </div>
  );
}
