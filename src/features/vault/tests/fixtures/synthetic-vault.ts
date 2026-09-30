/** `alvo.md` linked from `linkingToTarget` notes across folders (SC-001, SC-002). */
export function createSyntheticVault({
  notes,
  linkingToTarget,
}: {
  notes: number
  linkingToTarget: number
}): Record<string, string> {
  const files: Record<string, string> = {
    "alvo.md": "# Alvo\n\nNota referenciada por muitas outras.\n",
  }
  const step = Math.max(1, Math.floor((notes - 1) / linkingToTarget))
  let linking = 0
  for (let index = 1; index < notes; index++) {
    const folder = `area-${index % 25}/sub-${index % 7}`
    const linksTarget = index % step === 0 && linking < linkingToTarget
    if (linksTarget) linking++
    const links = linksTarget
      ? `Ver [[alvo]] e [[alvo#Seção|o alvo]].\n`
      : `Ver [[nota-${(index + 1) % notes}]].\n`
    files[`${folder}/nota-${index}.md`] = `# Nota ${index}\n\n${links}`
  }
  return files
}
