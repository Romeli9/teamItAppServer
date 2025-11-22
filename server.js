require('dotenv').config();
const express = require('express');
const multer = require('multer');
const Minio = require('minio');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const { db } = require('./firebase');

const app = express();
app.use(cors());

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_PORT = Number(process.env.MINIO_PORT);
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
const BUCKET_NAME = process.env.BUCKET_NAME;

const minioClient = new Minio.Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

minioClient.bucketExists(BUCKET_NAME, function (err, exists) {
  if (err) return console.error('Ошибка проверки бакета:', err);
  if (!exists) {
    minioClient.makeBucket(BUCKET_NAME, 'us-east-1', function (err) {
      if (err) return console.error('Ошибка создания бакета:', err);
      console.log(`Бакет "${BUCKET_NAME}" создан`);
    });
  } else {
    console.log(`Бакет "${BUCKET_NAME}" уже существует`);
  }
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = path.extname(req.file.originalname);
  const fileName = crypto.randomBytes(16).toString('hex') + ext;

  minioClient.putObject(BUCKET_NAME, fileName, req.file.buffer, req.file.size, (err) => {
    if (err) return res.status(500).json({ error: 'Upload failed' });
    res.json({ id: fileName });
  });
});

app.get('/file/:id', async (req, res) => {
  const fileId = req.params.id;
  try {
    const presignedUrl = await minioClient.presignedGetObject(BUCKET_NAME, fileId, 24 * 60 * 60);
    res.json({ url: presignedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate link' });
  }
});

app.post('/achievements/calculate', express.json(), async (req, res) => {
  try {
    const { userId, projects, reviews } = req.body;

    if (!userId || !projects || !reviews)
      return res.status(400).json({ error: 'Missing userId/projects/reviews' });

    // Загружаем дефиниции ачивок
    const achSnapshot = await db.collection('achievements').get();
    const achievementDefs = achSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Метрики
    const userReviews = reviews.filter((r) => r.toUserId === userId);
    const authored = projects.filter((p) => p.creatorId === userId);
    const completed = authored.filter((p) => p.status === 'completed');

    const metrics = {
      avgRating: userReviews.length
        ? userReviews.reduce((s, r) => s + (r.hardSkills ?? 0), 0) / userReviews.length
        : 0,
      completedProjects: completed.length,
      positiveComments: userReviews.filter((r) =>
        (r.comment || '').toLowerCase().includes('спасибо'),
      ).length,
    };

    function checkRule(rule) {
      if (!rule) return false;
      if (rule.and) return rule.and.every(checkRule);
      if (rule.or) return rule.or.some(checkRule);

      const left = metrics[rule.metric];
      const right = rule.value;

      switch (rule.operator) {
        case '>=':
          return left >= right;
        case '<=':
          return left <= right;
        case '>':
          return left > right;
        case '<':
          return left < right;
        case '==':
          return left == right;
        case '!=':
          return left != right;
        default:
          return false;
      }
    }

    const result = achievementDefs.filter((a) => checkRule(a.rule));

    res.json({ achievements: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Achievement calculation failed' });
  }
});

// HTTPS сервер с настоящим сертификатом
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/teamitserver.ru/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/teamitserver.ru/fullchain.pem'),
};

const PORT = Number(process.env.PORT) || 5000;
https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
  console.log(`HTTPS Server running on https://0.0.0.0:${PORT}`);
});
