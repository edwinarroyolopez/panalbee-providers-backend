export default () => ({
  app: {
    mode: process.env.APP_MODE ?? 'PUBLIC',
  },
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD ?? '',
    api_key: process.env.CLOUDINARY_KEY ?? '',
    api_secret: process.env.CLOUDINARY_SECRET ?? '',
  },
  mongo: {
    uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/template_backend',
    db: process.env.MONGO_DB ?? 'template_backend',
  },
});
