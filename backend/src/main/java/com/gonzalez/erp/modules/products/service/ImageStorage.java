package com.gonzalez.erp.modules.products.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;
import java.time.Duration;
import java.util.Optional;

/** Acceso al almacenamiento S3-compatible de las fotos. Solo cambia la configuración entre entornos. */
@Component
public class ImageStorage {

    public record StoredObject(long sizeBytes) {}

    private final S3Client client;
    private final S3Presigner presigner;
    private final String bucket;
    private final String publicUrl;

    public ImageStorage(
            @Value("${app.storage.endpoint}") String endpoint,
            @Value("${app.storage.region}") String region,
            @Value("${app.storage.bucket}") String bucket,
            @Value("${app.storage.access-key}") String accessKey,
            @Value("${app.storage.secret-key}") String secretKey,
            @Value("${app.storage.public-url}") String publicUrl) {
        StaticCredentialsProvider credentials =
                StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));
        // Rutas "endpoint/bucket/clave" en vez de "bucket.endpoint": las piden los servidores locales.
        S3Configuration pathStyle = S3Configuration.builder().pathStyleAccessEnabled(true).build();

        this.client = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(credentials)
                .serviceConfiguration(pathStyle)
                .httpClient(UrlConnectionHttpClient.create())
                .build();
        this.presigner = S3Presigner.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(credentials)
                .serviceConfiguration(pathStyle)
                .build();
        this.bucket = bucket;
        this.publicUrl = publicUrl.endsWith("/") ? publicUrl.substring(0, publicUrl.length() - 1) : publicUrl;
    }

    /**
     * URL para subir un archivo directo al almacenamiento, sin pasar por el backend. La firma
     * incluye el tipo y el tamaño declarados: si el archivo no coincide, el almacenamiento lo rechaza.
     */
    public String presignUpload(String key, String contentType, long sizeBytes, Duration validity) {
        return presigner.presignPutObject(presign -> presign
                        .signatureDuration(validity)
                        .putObjectRequest(put -> put
                                .bucket(bucket)
                                .key(key)
                                .contentType(contentType)
                                .contentLength(sizeBytes)))
                .url()
                .toString();
    }

    public Optional<StoredObject> find(String key) {
        try {
            HeadObjectResponse head = client.headObject(request -> request.bucket(bucket).key(key));
            return Optional.of(new StoredObject(head.contentLength()));
        } catch (NoSuchKeyException e) {
            return Optional.empty();
        } catch (S3Exception e) {
            // HEAD no tiene cuerpo: algunos servidores responden un 404 genérico en vez de NoSuchKey.
            if (e.statusCode() == 404) {
                return Optional.empty();
            }
            throw e;
        }
    }

    /** Los primeros bytes del archivo, para reconocer el formato por su firma y no por lo que declaró el cliente. */
    public byte[] readFirstBytes(String key, int count) {
        ResponseBytes<GetObjectResponse> bytes = client.getObjectAsBytes(request -> request
                .bucket(bucket)
                .key(key)
                .range("bytes=0-" + (count - 1)));
        return bytes.asByteArray();
    }

    public void delete(String key) {
        client.deleteObject(request -> request.bucket(bucket).key(key));
    }

    public String publicUrl(String key) {
        return publicUrl + "/" + key;
    }
}
