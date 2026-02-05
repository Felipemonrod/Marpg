import { openDB, type DBSchema } from 'idb'

export type AssetRecord = {
  id: string
  name: string
  mimeType: string
  createdAt: number
  blob: Blob
}

export type TokenRecord = {
  id: string
  assetId: string
  lat: number
  lng: number
  size: number
}

export type LayerRecord = {
  id: string
  name: string
  visible: boolean
  opacity: number
  tokens: TokenRecord[]
}

export type MapOverlayState = {
  mapId: string
  updatedAt: number
  layers: LayerRecord[]
}

type RpgMapDb = DBSchema & {
  assets: {
    key: string
    value: AssetRecord
    indexes: { 'by-createdAt': number }
  }
  mapStates: {
    key: string
    value: MapOverlayState
  }
}

const dbPromise = openDB<RpgMapDb>('rpgmap-db', 1, {
  upgrade(db) {
    const assets = db.createObjectStore('assets', { keyPath: 'id' })
    assets.createIndex('by-createdAt', 'createdAt')

    db.createObjectStore('mapStates', { keyPath: 'mapId' })
  },
})

export async function saveAssetFromFile(file: File): Promise<AssetRecord> {
  const id = crypto.randomUUID()
  const record: AssetRecord = {
    id,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    createdAt: Date.now(),
    blob: file,
  }

  const db = await dbPromise
  await db.put('assets', record)
  return record
}

export async function saveAssetFromBlob(blob: Blob, name: string): Promise<AssetRecord> {
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' })
  return await saveAssetFromFile(file)
}

export async function listAssets(): Promise<AssetRecord[]> {
  const db = await dbPromise
  const records = await db.getAllFromIndex('assets', 'by-createdAt')
  return records.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getAsset(id: string): Promise<AssetRecord | undefined> {
  const db = await dbPromise
  return await db.get('assets', id)
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await dbPromise
  await db.delete('assets', id)
}

export async function loadMapState(mapId: string): Promise<MapOverlayState | undefined> {
  const db = await dbPromise
  return await db.get('mapStates', mapId)
}

export async function saveMapState(state: MapOverlayState): Promise<void> {
  const db = await dbPromise
  await db.put('mapStates', { ...state, updatedAt: Date.now() })
}
