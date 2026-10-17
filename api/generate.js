const MODEL = "fal-ai/vidu/q3/text-to-video";

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const key = process.env.FAL_KEY;

  if (!key) {
    return res.status(500).json({
      error: "FAL_KEY missing. Check Vercel Environment Variables."
    });
  }

  try {
    if (req.method === "POST") {
      const prompt = String(req.body?.prompt || "").trim();

      if (!prompt) {
        return res.status(400).json({
          error: "Please enter a video prompt."
        });
      }

      if (prompt.length > 2000) {
        return res.status(400).json({
          error: "Prompt must be 2000 characters or less."
        });
      }

      const response = await fetch(
        `https://queue.fal.run/${MODEL}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Key ${key}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt,
            duration: 5,
            aspect_ratio: "16:9",
            resolution: "720p",
            audio: true
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: data.detail || data.message ||
            "fal.ai could not accept the request."
        });
      }

      return res.status(200).json({
        status: "IN_QUEUE",
        request_id: data.request_id,
        message: "Video request submitted."
      });
    }

    if (req.method === "GET") {
      const id = String(req.query?.request_id || "");

      if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return res.status(400).json({
          error: "Invalid request_id."
        });
      }

      const statusResponse = await fetch(
        `https://queue.fal.run/${MODEL}/requests/${id}/status`,
        {
          headers: { "Authorization": `Key ${key}` }
        }
      );

      const statusData = await statusResponse.json();

      if (!statusResponse.ok) {
        return res.status(statusResponse.status).json({
          error: statusData.detail || "Could not check video status."
        });
      }

      if (statusData.status !== "COMPLETED") {
        return res.status(200).json({
          status: statusData.status
        });
      }

      const resultResponse = await fetch(
        `https://queue.fal.run/${MODEL}/requests/${id}`,
        {
          headers: { "Authorization": `Key ${key}` }
        }
      );

      const result = await resultResponse.json();

      if (!resultResponse.ok) {
        return res.status(resultResponse.status).json({
          error: result.detail || "Could not retrieve video."
        });
      }

      return res.status(200).json({
        status: "COMPLETED",
        videoUrl: result.video?.url || null
      });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({
      error: "Method not allowed."
    });
  } catch (error) {
    return res.status(500).json({
      error: "Backend request failed. Check Vercel logs."
    });
  }
};
