export const progressPhotoViews = ["front", "side", "back"] as const

export type ProgressPhotoView = (typeof progressPhotoViews)[number]

export type ProgressPhoto = {
  id: string
  takenOn: string
  view: ProgressPhotoView
  storagePath: string
  signedUrl: string
}

export const progressPhotoViewLabels: Record<ProgressPhotoView, string> = {
  front: "Frontal",
  side: "Lateral",
  back: "Espalda",
}
