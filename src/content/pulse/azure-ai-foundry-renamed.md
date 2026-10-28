---
title: "November 2025: Azure AI Foundry becomes Microsoft Foundry"
date: 2026-10-26
tags: [cloud, azure]
source:
  label: Microsoft Learn, deployment types for Microsoft Foundry Models
  url: https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/deployment-types
---

**What changed.** Microsoft announced at Ignite in November 2025 that Azure AI Foundry is now Microsoft Foundry. It was Azure AI Studio before that. Microsoft's [role-based access control page](https://learn.microsoft.com/en-us/azure/foundry/concepts/rbac-foundry) says the built-in roles were renamed as well (Azure AI User is now Foundry User, and so on) with the same role IDs and permissions.

**Why it matters.** Endpoints and keys for existing deployments carried on working, but documentation, SDK samples and role names now differ between older and newer material.

**What to do.** Microsoft advises using role IDs rather than names in scripts while the rename rolls out. Search for all three names when troubleshooting. See [Microsoft Foundry and Azure OpenAI](../../learn/cloud/microsoft-foundry-and-azure-openai/).
