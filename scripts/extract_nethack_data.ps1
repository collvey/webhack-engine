# Extract NetHack data from generated headers for use in TypeScript
# This script parses pm.h, onames.h, and rm.h to generate TypeScript mappings

$projectRoot = "C:\Users\collv\OneDrive\Documents\Github\WebHack"
$includeDir = "$projectRoot\include"
$outputDir = "$projectRoot\webhack-client\src\data"

# Create output directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

# Extract monster names from pm.h
Write-Host "Extracting monsters from pm.h..."
$monsterMatches = Select-String -Path "$includeDir\pm.h" -Pattern '^\s+PM_(\w+)\s+=\s+(\d+)'
$monsters = @()
foreach ($match in $monsterMatches) {
    $name = $match.Matches.Groups[1].Value
    $id = $match.Matches.Groups[2].Value
    $displayName = $name.Replace('_', ' ').ToLower()
    $displayName = (Get-Culture).TextInfo.ToTitleCase($displayName)
    $monsters += "  $id`: { id: $id, name: '$displayName', internalName: 'PM_$name' }"
}

# Extract object names from onames.h
Write-Host "Extracting objects from onames.h..."
$objectMatches = Select-String -Path "$includeDir\onames.h" -Pattern '^\#define\s+(\w+)\s+(\d+)'
$objects = @()
$seenIds = @{}
foreach ($match in $objectMatches) {
    $name = $match.Matches.Groups[1].Value
    $id = $match.Matches.Groups[2].Value
    # Skip header guard, count constant, artifacts, and duplicates
    if ($name -ne "ONAMES_H" -and $name -ne "NUM_OBJECTS" -and $name -notmatch "^ART_" -and $name -notmatch "ARTIFACT" -and $name -ne "MAXSPELL" -and -not $seenIds.ContainsKey($id)) {
        $displayName = $name.Replace('_', ' ').ToLower()
        $displayName = (Get-Culture).TextInfo.ToTitleCase($displayName)
        $objects += "  $id`: { id: $id, name: '$displayName', internalName: '$name' }"
        $seenIds[$id] = $true
    }
}

# Extract terrain symbols from rm.h
Write-Host "Extracting terrain from rm.h..."
$terrainMatches = Select-String -Path "$includeDir\rm.h" -Pattern '^\s+(S_\w+)\s+=\s+(\d+)'
$terrain = @()
foreach ($match in $terrainMatches) {
    $name = $match.Matches.Groups[1].Value
    $id = $match.Matches.Groups[2].Value
    $displayName = $name.Replace('S_', '').Replace('_', ' ').ToLower()
    $displayName = (Get-Culture).TextInfo.ToTitleCase($displayName)
    $terrain += "  $id`: { id: $id, name: '$displayName', internalName: '$name' }"
}

# Generate TypeScript file
$tsContent = @"
/**
 * NetHack Data Mappings
 * Auto-generated from include/pm.h, include/onames.h, and include/rm.h
 * DO NOT EDIT MANUALLY - Run scripts/extract_nethack_data.ps1 to regenerate
 */

export interface MonsterData {
  id: number;
  name: string;
  internalName: string;
}

export interface ObjectData {
  id: number;
  name: string;
  internalName: string;
}

export interface TerrainData {
  id: number;
  name: string;
  internalName: string;
}

export const MONSTERS: Record<number, MonsterData> = {
$($monsters -join ",`n")
};

export const OBJECTS: Record<number, ObjectData> = {
$($objects -join ",`n")
};

export const TERRAIN: Record<number, TerrainData> = {
$($terrain -join ",`n")
};
"@

$outputFile = "$outputDir\NetHackData.ts"
$tsContent | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "Generated: $outputFile"
Write-Host "Monsters: $($monsters.Count)"
Write-Host "Objects: $($objects.Count)"
Write-Host "Terrain: $($terrain.Count)"
