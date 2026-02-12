"use client";

import React, { useEffect, useRef, useState } from "react";
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
  saved_jobs?: Array<{
    title?: string;
    company?: string;
    apply_url?: string;
    description?: string;
  }>;
  resumes?: Array<{
    id?: string;
    name?: string;
    resume_id?: string;
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
  const [selectedNode, setSelectedNode] = useState<{ id: string; label?: string; group?: string; properties?: any } | null>(null);

  // Safely convert possible nested values into readable strings
  const asString = (val: any) => {
    if (val == null) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
      // Try common properties that might be used by external APIs
      return val.name || val.label || val.title || JSON.stringify(val);
    }
    return String(val);
  };

  // Build nodes/edges from the data
  const buildGraph = (d: GraphData) => {
    const nodes: VNode[] = [];
    const edges: VEdge[] = [];

    // Person node
    const personNameLabel = asString(d.person?.name ?? d.person);
    const personId = `person:${personNameLabel}`;
    nodes.push({ id: personId, label: personNameLabel, group: "person", title: `Person: ${personNameLabel}`, properties: d.person } as any);

    // Skills
    d.skills.forEach((skill, idx) => {
      const sid = `skill:${asString(skill)}`;
      nodes.push({ id: sid, label: asString(skill), group: "skill", title: `Skill: ${asString(skill)}` });
      edges.push({ from: personId, to: sid, label: "HAS_SKILL", arrows: "to" });
    });

    // Experiences
    d.experiences.forEach((exp, idx) => {
      const eid = `exp:${idx}`;
      const expTitle = asString(exp.title || exp.company || "");
      const label = exp.company ? `${asString(exp.title)} @ ${asString(exp.company)}` : asString(exp.title);
      const title = `${asString(exp.title)}${exp.company ? ` @ ${asString(exp.company)}` : ""}${exp.description ? `\n\n${asString(exp.description)}` : ""}`;
      nodes.push({ id: eid, label, group: "experience", title });
      edges.push({ from: personId, to: eid, label: "HAS_EXPERIENCE", arrows: "to" });
    });

    // Education
    d.education.forEach((edu, idx) => {
      const gid = `edu:${idx}`;
      const label = asString(edu.degree || edu.institution || "Education");
      const title = `${asString(edu.degree) ? asString(edu.degree) + " — " : ""}${asString(edu.institution)}${edu.year ? `\n${edu.year}` : ""}`;
      nodes.push({ id: gid, label, group: "education", title });
      edges.push({ from: personId, to: gid, label: "HAS_EDUCATION", arrows: "to" });
    });

    // Resumes
    if (d.resumes && d.resumes.length > 0) {
      d.resumes.forEach((r) => {
        const rid = `resume:${asString(r.id || r.resume_id || r.name)}`;
        const rLabel = asString(r.name || r.resume_id || "Resume");
        nodes.push({ id: rid, label: rLabel, group: "resume", title: `Resume: ${rLabel}`, properties: r } as any);
        // connect person -> resume
        edges.push({ from: personId, to: rid, label: "HAS_RESUME", arrows: "to" });
      });
    }

    // Saved Jobs
    if (d.saved_jobs && d.saved_jobs.length > 0) {
      d.saved_jobs.forEach((job, idx) => {
        const jid_safe = (asString(job.apply_url || job.title || `job-${idx}`)).replace(/https?:\/\//, "").replace(/[\/\s]+/g, "_");
        const jid = `job:${jid_safe}`;
        const jobLabel = asString(job.title || job.company || jid_safe);
        nodes.push({ id: jid, label: jobLabel, group: "job", title: `${asString(job.title || '')}${job.company ? ` @ ${asString(job.company)}` : ''}`, properties: job } as any);
        // attach to resume if available in nodes
        if (d.resumes && d.resumes.length > 0) {
          const rid = `resume:${d.resumes[0].id || d.resumes[0].resume_id || d.resumes[0].name}`;
          edges.push({ from: rid, to: jid, label: "SAVED_JOB", arrows: "to" });
        } else {
          // fallback connect to person
          edges.push({ from: personId, to: jid, label: "SAVED_JOB", arrows: "to" });
        }
      });
    }

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
        ,
        resume: { color: { background: "#a78bfa", border: "#7c3aed" } },
        job: { color: { background: "#f59e0b", border: "#975a16" } }
      }
    };

    networkRef.current = new Network(container, data as any, options);

    networkRef.current.on("click", function (params) {
      if (params.nodes && params.nodes.length > 0) {
        const clickedId = params.nodes[0];
        // Retrieve node data
        try {
          const nodeData = ((networkRef.current as any).body.data.nodes.get(clickedId) as any) || null;
          if (nodeData) {
              const labelVal = typeof nodeData.label === 'string' ? nodeData.label : (nodeData.properties?.name ? asString(nodeData.properties.name) : asString(nodeData.label));
              setSelectedNode({ id: clickedId, label: labelVal, group: nodeData.group, properties: nodeData.properties || nodeData })
          }
        } catch (e) {
          setSelectedNode(null);
        }
      } else {
        // click on background
        setSelectedNode(null);
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
    <div className="mt-4 relative">
      <div ref={containerRef} style={{ width: "100%", height: "600px", background: "transparent", borderRadius: 8 }} />

      {/* Sidebar */}
      <div
        className={`absolute top-0 right-0 z-40 h-full transition-transform transform ${selectedNode ? 'translate-x-0' : 'translate-x-[110%]'}`}
        style={{ width: 360, background: 'rgba(10, 11, 14, 0.95)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}
      >
        <div className="p-4 h-full overflow-y-auto">
          {!selectedNode && (
            <div className="text-sm text-muted">Click a node to view details</div>
          )}
          {selectedNode && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[16px] font-semibold">{selectedNode.label}</div>
                  <div className="text-[12px] text-muted">{selectedNode.group}</div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-sm px-2 py-1 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.14)]"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2">
                {selectedNode.properties && Object.entries(selectedNode.properties).map(([k, v]) => (
                  <div key={k} className="text-[13px] text-muted">
                    <div className="font-medium text-[13px] text-foreground">{k}</div>
                    <div className="text-[13px] text-muted">{asString(v)}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-4">
                {/* Open job URL if present */}
                {selectedNode.properties?.apply_url && (
                  <a className="inline-block mb-2 text-xs px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white" href={asString(selectedNode.properties.apply_url)} target="_blank" rel="noopener noreferrer">Open job URL</a>
                )}
                {/* Open Neo4j Browser */}
                <a className="inline-block text-xs px-3 py-1 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.14)] text-muted" href="http://localhost:7474" target="_blank" rel="noopener noreferrer">Open Neo4j Browser</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
