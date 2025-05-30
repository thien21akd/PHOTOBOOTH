function initFaceMesh() {
            try {
                faceMesh = new FaceMesh({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`
                });
                faceMesh.setOptions({
                    maxNumFaces: 1,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                faceMesh.onResults(onFaceMeshResults);
                console.log("FaceMesh initialized successfully");
            } catch (err) {
                console.error("FaceMesh initialization failed:", err);
                alert("Lỗi khi khởi tạo FaceMesh.");
            }
        }

        // Handle FaceMesh results
        function onFaceMeshResults(results) {
            if (!ctx || !results.image) {
                console.error("Canvas context or image data unavailable");
                return;
            }

            ctx.save();
            ctx.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);

            // Draw video feed
            ctx.drawImage(results.image, 0, 0, cameraCanvas.width, cameraCanvas.height);

            // Apply stickers if any
            if (results.multiFaceLandmarks) {
                for (const landmarks of results.multiFaceLandmarks) {
                    if (currentSticker) {
                        applySticker(landmarks);
                    }
                }
            }

            // Apply frame in real-time
            if (currentFrame) {
                const frameImg = new Image();
                frameImg.src = currentFrame;
                frameImg.onload = () => {
                    ctx.drawImage(frameImg, 0, 0, cameraCanvas.width, cameraCanvas.height);
                };
                if (frameImg.complete) {
                    ctx.drawImage(frameImg, 0, 0, cameraCanvas.width, cameraCanvas.height);
                }
            }

            ctx.restore();
        }

        // Apply sticker to face
        function applySticker(landmarks) {
            if (!currentSticker) return;

            const leftEye = landmarks[33];
            const rightEye = landmarks[263];

            if (leftEye && rightEye) {
                const eyeDistance = Math.sqrt(
                    Math.pow(rightEye.x - leftEye.x, 2) +
                    Math.pow(rightEye.y - leftEye.y, 2)
                ) * cameraCanvas.width;

                const stickerWidth = eyeDistance * 2;
                const stickerHeight = stickerWidth * 0.8;

                const stickerX = leftEye.x * cameraCanvas.width - eyeDistance * 0.7;
                const stickerY = leftEye.y * cameraCanvas.height - eyeDistance * 0.5;

                const img = new Image();
                img.src = currentSticker;
                img.onload = () => {
                    ctx.drawImage(img, stickerX, stickerY, stickerWidth, stickerHeight);
                };
                if (img.complete) {
                    ctx.drawImage(img, stickerX, stickerY, stickerWidth, stickerHeight);
                }
            }
        }