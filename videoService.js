const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

function convertToHLS(inputPath, outputDir, lessonId) {
  return new Promise((resolve, reject) => {
    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
    
    // Create multiple quality variants
    const qualities = [
      { name: '360p', width: 640, height: 360, bitrate: '800k', audioBitrate: '96k' },
      { name: '720p', width: 1280, height: 720, bitrate: '2800k', audioBitrate: '128k' },
      { name: '1080p', width: 1920, height: 1080, bitrate: '5000k', audioBitrate: '192k' },
    ];
    
    let videoInfo = null;
    
    // Get video info first
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        logger.error('FFprobe error:', err);
        reject(err);
        return;
      }
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const duration = Math.floor(metadata.format.duration || 0);
      
      // Generate each quality variant
      const ffmpegProcess = ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .addOption('-hls_time', '10')
        .addOption('-hls_list_size', '0')
        .addOption('-hls_segment_type', 'mpegts')
        .addOption('-hls_flags', 'independent_segments')
        .addOption('-master_pl_name', 'master.m3u8')
        .addOption('-var_stream_map', qualities.map((q, i) => `v:${i},a:${i}`).join(' '))
        .outputFormat('hls');
      
      // Add outputs for each quality
      qualities.forEach((q, i) => {
        ffmpegProcess
          .addOption(`-map`, '0:v:0')
          .addOption(`-map`, '0:a:0')
          .addOption(`-s:v:${i}`, `${q.width}x${q.height}`)
          .addOption(`-b:v:${i}`, q.bitrate)
          .addOption(`-b:a:${i}`, q.audioBitrate)
          .addOption(`-hls_segment_filename`, path.join(outputDir, `${q.name}_%03d.ts`));
      });
      
      ffmpegProcess
        .output(path.join(outputDir, 'playlist_%v.m3u8'))
        .on('start', (commandLine) => {
          logger.info(`FFmpeg started: ${commandLine}`);
        })
        .on('progress', (progress) => {
          logger.info(`FFmpeg progress: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          logger.info(`Video conversion complete: ${lessonId}`);
          // Clean up original upload
          fs.unlink(inputPath, () => {});
          resolve(duration);
        })
        .on('error', (err) => {
          logger.error('FFmpeg error:', err);
          // Fallback: simple single quality HLS
          convertToHLSSimple(inputPath, outputDir, lessonId)
            .then(resolve)
            .catch(reject);
        })
        .run();
    });
  });
}

// Fallback single quality HLS conversion
function convertToHLSSimple(inputPath, outputDir, lessonId) {
  return new Promise((resolve, reject) => {
    let duration = 0;
    
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .videoBitrate('1500k')
      .audioBitrate('128k')
      .videoFilter('scale=1280:720:force_original_aspect_ratio=decrease')
      .addOption('-hls_time', '10')
      .addOption('-hls_list_size', '0')
      .addOption('-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'))
      .output(path.join(outputDir, 'master.m3u8'))
      .outputFormat('hls')
      .on('codecData', (data) => {
        // Extract duration
      })
      .on('end', () => {
        fs.unlink(inputPath, () => {});
        resolve(duration);
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

function generateThumbnail(videoPath, outputPath, timeOffset = '00:00:05') {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timeOffset],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '1280x720',
      })
      .on('end', () => resolve(outputPath))
      .on('error', reject);
  });
}

module.exports = { convertToHLS, generateThumbnail };
