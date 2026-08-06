const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/

export function getYouTubeVideoId(value: string) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.replace(/^www\./, "")

    if (hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0]
      return id && youtubeIdPattern.test(id) ? id : null
    }

    if (hostname === "youtube.com" || hostname === "youtube-nocookie.com") {
      const pathId = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]
      const id = url.searchParams.get("v") ?? pathId
      return id && youtubeIdPattern.test(id) ? id : null
    }
  } catch {
    return null
  }

  return null
}

export function getYouTubeEmbedUrl(value: string) {
  const id = getYouTubeVideoId(value)
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null
}
