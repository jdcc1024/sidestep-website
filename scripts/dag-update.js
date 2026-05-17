#!/usr/bin/env node
/**
 * DAG State Updater
 *
 * CLI tool for agents (or humans) to update the DAG state file.
 * Agents call this when they pick up, complete, or fail a task.
 *
 * Usage:
 *   node scripts/dag-update.js <command> [options]
 *
 * Commands:
 *   start <nodeId> <agentId> [agentName]    — Mark task as in-progress, assign agent
 *   complete <nodeId> <agentId>             — Mark task as completed
 *   fail <nodeId> <agentId> [reason]        — Mark task as failed/blocked
 *   add-node <id> <title> <phase> <type> [--desc "..."] [--prd "..."] [--criteria "a|b|c"]
 *                                           — Add a new task node with optional metadata
 *   add-edge <fromId> <toId>                — Add a dependency edge
 *   agent-join <agentId> <agentName>        — Register a new agent
 *   agent-leave <agentId>                   — Deregister an agent
 *   status                                  — Print current DAG summary
 *
 * Examples:
 *   node scripts/dag-update.js start 1-02 agent-1 "Claude (Session A)"
 *   node scripts/dag-update.js complete 1-02 agent-1
 *   node scripts/dag-update.js add-node 2-03 "Payment Integration" phase-2 feature
 *   node scripts/dag-update.js add-edge 2-01 2-03
 */

const fs = require('fs');
const path = require('path');

const DAG_FILE = path.resolve(__dirname, '..', 'dag.json');

function readDAG() {
  try {
    return JSON.parse(fs.readFileSync(DAG_FILE, 'utf-8'));
  } catch (e) {
    return {
      project: "My Project",
      lastUpdated: new Date().toISOString(),
      phases: [
        { id: "phase-1", name: "Foundation", description: "Core infrastructure" },
        { id: "phase-2", name: "Core Features", description: "Main value proposition" },
        { id: "phase-3", name: "Polish", description: "Enhancements" }
      ],
      nodes: [],
      edges: [],
      agents: [],
      log: []
    };
  }
}

function writeDAG(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DAG_FILE, JSON.stringify(data, null, 2));
}

function addLog(data, event, nodeId, agent, message) {
  data.log.push({
    timestamp: new Date().toISOString(),
    event,
    nodeId,
    agent,
    message
  });
  // Keep last 100 log entries
  if (data.log.length > 100) data.log = data.log.slice(-100);
}

function updateBlockedStatus(data) {
  // Auto-detect blocked nodes: pending nodes whose dependencies aren't all completed
  data.nodes.forEach(node => {
    if (node.status !== 'pending' && node.status !== 'blocked') return;

    const incomingEdges = data.edges.filter(e => e.to === node.id);
    if (incomingEdges.length === 0) {
      if (node.status === 'blocked') node.status = 'pending';
      return;
    }

    const allDepsComplete = incomingEdges.every(edge => {
      const depNode = data.nodes.find(n => n.id === edge.from);
      return depNode && depNode.status === 'completed';
    });

    node.status = allDepsComplete ? 'pending' : 'blocked';
  });
}

// --- Commands ---

const [,, command, ...args] = process.argv;

const dag = readDAG();

switch (command) {
  case 'start': {
    const [nodeId, agentId, agentName] = args;
    if (!nodeId || !agentId) { console.error('Usage: start <nodeId> <agentId> [agentName]'); process.exit(1); }

    const node = dag.nodes.find(n => n.id === nodeId);
    if (!node) { console.error(`Node ${nodeId} not found`); process.exit(1); }

    node.status = 'in-progress';
    node.agent = agentId;
    node.startedAt = new Date().toISOString();

    // Ensure agent exists
    let agent = dag.agents.find(a => a.id === agentId);
    if (!agent) {
      agent = { id: agentId, name: agentName || agentId, status: 'working', currentTask: nodeId, tasksCompleted: 0 };
      dag.agents.push(agent);
    } else {
      agent.status = 'working';
      agent.currentTask = nodeId;
      if (agentName) agent.name = agentName;
    }

    addLog(dag, 'task_started', nodeId, agentId, `${agent.name} picked up: ${node.title}`);
    updateBlockedStatus(dag);
    writeDAG(dag);
    console.log(`Started: ${node.title} → ${agent.name}`);
    break;
  }

  case 'complete': {
    const [nodeId, agentId] = args;
    if (!nodeId || !agentId) { console.error('Usage: complete <nodeId> <agentId>'); process.exit(1); }

    const node = dag.nodes.find(n => n.id === nodeId);
    if (!node) { console.error(`Node ${nodeId} not found`); process.exit(1); }

    node.status = 'completed';
    node.completedAt = new Date().toISOString();

    const agent = dag.agents.find(a => a.id === agentId);
    if (agent) {
      agent.tasksCompleted++;
      agent.currentTask = null;
      agent.status = 'idle';
    }

    addLog(dag, 'task_completed', nodeId, agentId, `Completed: ${node.title}`);
    updateBlockedStatus(dag);
    writeDAG(dag);
    console.log(`Completed: ${node.title}`);
    break;
  }

  case 'fail': {
    const [nodeId, agentId, ...reasonParts] = args;
    if (!nodeId || !agentId) { console.error('Usage: fail <nodeId> <agentId> [reason]'); process.exit(1); }

    const reason = reasonParts.join(' ') || 'Unknown failure';
    const node = dag.nodes.find(n => n.id === nodeId);
    if (!node) { console.error(`Node ${nodeId} not found`); process.exit(1); }

    node.status = 'blocked';
    node.agent = null;

    const agent = dag.agents.find(a => a.id === agentId);
    if (agent) {
      agent.currentTask = null;
      agent.status = 'idle';
    }

    addLog(dag, 'task_failed', nodeId, agentId, `Failed: ${node.title} — ${reason}`);
    writeDAG(dag);
    console.log(`Failed: ${node.title} — ${reason}`);
    break;
  }

  case 'add-node': {
    // Parse positional args and optional flags
    const positional = [];
    let desc = '';
    let prdRef = '';
    let criteria = [];

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--desc' && args[i+1]) { desc = args[++i]; }
      else if (args[i] === '--prd' && args[i+1]) { prdRef = args[++i]; }
      else if (args[i] === '--criteria' && args[i+1]) { criteria = args[++i].split('|'); }
      else { positional.push(args[i]); }
    }

    const [id, title, phase, type] = positional;
    if (!id || !title || !phase || !type) {
      console.error('Usage: add-node <id> <title> <phase> <type> [--desc "..."] [--prd "..."] [--criteria "a|b|c"]');
      process.exit(1);
    }

    if (dag.nodes.find(n => n.id === id)) {
      console.error(`Node ${id} already exists`);
      process.exit(1);
    }

    const node = {
      id, title, phase, type,
      description: desc || '',
      status: 'pending',
      agent: null,
      startedAt: null,
      completedAt: null,
      issueFile: `backlog/${id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`,
      prdRef: prdRef || '',
      acceptanceCriteria: criteria
    };

    dag.nodes.push(node);

    addLog(dag, 'nodes_added', id, null, `New task added: ${title}`);
    updateBlockedStatus(dag);
    writeDAG(dag);
    console.log(`Added node: ${id} — ${title}`);
    break;
  }

  case 'add-edge': {
    const [fromId, toId] = args;
    if (!fromId || !toId) { console.error('Usage: add-edge <fromId> <toId>'); process.exit(1); }

    if (!dag.nodes.find(n => n.id === fromId)) { console.error(`Node ${fromId} not found`); process.exit(1); }
    if (!dag.nodes.find(n => n.id === toId)) { console.error(`Node ${toId} not found`); process.exit(1); }

    const exists = dag.edges.find(e => e.from === fromId && e.to === toId);
    if (!exists) {
      dag.edges.push({ from: fromId, to: toId });
    }

    updateBlockedStatus(dag);
    writeDAG(dag);
    console.log(`Edge added: ${fromId} → ${toId}`);
    break;
  }

  case 'agent-join': {
    const [agentId, ...nameParts] = args;
    const agentName = nameParts.join(' ') || agentId;
    if (!agentId) { console.error('Usage: agent-join <agentId> <agentName>'); process.exit(1); }

    let agent = dag.agents.find(a => a.id === agentId);
    if (!agent) {
      agent = { id: agentId, name: agentName, status: 'idle', currentTask: null, tasksCompleted: 0 };
      dag.agents.push(agent);
    } else {
      agent.name = agentName;
      agent.status = 'idle';
    }

    addLog(dag, 'agent_joined', null, agentId, `${agentName} joined the workforce`);
    writeDAG(dag);
    console.log(`Agent joined: ${agentName}`);
    break;
  }

  case 'agent-leave': {
    const [agentId] = args;
    if (!agentId) { console.error('Usage: agent-leave <agentId>'); process.exit(1); }

    dag.agents = dag.agents.filter(a => a.id !== agentId);

    // Unassign any tasks this agent was working on
    dag.nodes.forEach(node => {
      if (node.agent === agentId && node.status === 'in-progress') {
        node.status = 'pending';
        node.agent = null;
      }
    });

    writeDAG(dag);
    console.log(`Agent removed: ${agentId}`);
    break;
  }

  case 'status': {
    const counts = { completed: 0, 'in-progress': 0, pending: 0, blocked: 0 };
    dag.nodes.forEach(n => { counts[n.status] = (counts[n.status] || 0) + 1; });

    console.log(`\n  Project: ${dag.project}`);
    console.log(`  Last Updated: ${dag.lastUpdated}\n`);
    console.log(`  Tasks: ${dag.nodes.length} total`);
    console.log(`    Completed:   ${counts.completed}`);
    console.log(`    In Progress: ${counts['in-progress']}`);
    console.log(`    Pending:     ${counts.pending}`);
    console.log(`    Blocked:     ${counts.blocked}`);
    console.log(`\n  Agents: ${dag.agents.length} registered`);
    dag.agents.forEach(a => {
      console.log(`    ${a.name} — ${a.status}${a.currentTask ? ` (working on #${a.currentTask})` : ''}`);
    });
    console.log('');
    break;
  }

  default:
    console.log(`
DAG Updater — manage the project DAG state file.

Commands:
  start <nodeId> <agentId> [agentName]    Mark task in-progress
  complete <nodeId> <agentId>             Mark task completed
  fail <nodeId> <agentId> [reason]        Mark task failed/blocked
  add-node <id> <title> <phase> <type>    Add new task
  add-edge <fromId> <toId>                Add dependency
  agent-join <agentId> <agentName>        Register agent
  agent-leave <agentId>                   Remove agent
  status                                  Print summary
    `);
}
