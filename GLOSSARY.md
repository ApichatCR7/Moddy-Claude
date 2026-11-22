# Moddy-Claude

Mods that change how Claude Code behaves and looks, made for the repo owner's own use in the Claude Code desktop app.

## Language

**Mod**:
A plugin that changes Claude Code's own interface or behaviour from inside the app.
_Avoid_: extension, add-on

**Marketplace**:
This repo seen as the place Claude Code installs its Mods from.
_Avoid_: registry, store

### Where a Mod shows up

**Band**:
A single always-visible row above the prompt box.
_Avoid_: bar, strip, header

**Pane**:
A panel beside the chat that is opened on demand and has room for full controls.
_Avoid_: sidebar, drawer, panel

### Context control

**Autocompact**:
Claude Code's automatic summarising of the earlier conversation when the context window is nearly full.
_Avoid_: auto compact, auto-summary

**Compact threshold**:
The context size a model's Autocompact is set to (Claude Code calls it the "auto-compact window"). It is set separately for each model and shown in tokens and as a percentage of that model's context window. Compaction actually begins a little before it.
_Avoid_: trigger point, limit

**Locked**:
The state of a control the Mod cannot change, because something outside it (an environment variable, an account that lacks the feature) decides the value.
_Avoid_: disabled, greyed out

### Advisor

**Advisor**:
A stronger model that the main model consults on hard steps during a session.
_Avoid_: Adviser, helper model

**Advisor model**:
The specific model chosen to act as the Advisor.
