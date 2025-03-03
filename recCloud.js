const {resolve} = require("node:path");

const IDENTIF = process.env.IDENTIF;
const SECRET_KEY = process.env.SECRET_KEY;

// Подключаем модуль
let EasyYandexS3 = require('easy-yandex-s3').default;
// ^ default — обязательно

// Инициализация
let s3 = new EasyYandexS3({
    auth: {
        accessKeyId: IDENTIF,
        secretAccessKey: SECRET_KEY,
    },
    Bucket: 'id-objstor', // например, "my-storage",
    debug: true, // Дебаг в консоли, потом можете удалить в релизе
});


async function recCloud(name){
    let upload = await s3.Upload(
        {
            path: resolve(__dirname, name),
        },
        '/images/'
    );
    // console.log(upload); // <- Возвращает путь к файлу в хранилище и всякую дополнительную информацию.
                        // если вернулся false - произошла ошибка
                        // Файл загрузится в [my-stogare]/test/{uuid-v4}.{расширение}

    // console.log(upload.Location)

    return upload.Location
}

exports.recCloud = recCloud;

