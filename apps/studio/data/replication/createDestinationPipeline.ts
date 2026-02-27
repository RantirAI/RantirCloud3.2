import type { components } from 'api-types'

import { handleError, post } from '../fetchers'
import { CreateDestinationPipelineParams } from './create-destination-pipeline-mutation'

export async function createDestinationPipeline(
  {
    projectRef,
    destinationName: destinationName,
    destinationConfig,
    pipelineConfig: {
      publicationName,
      batch,
      maxTableSyncWorkers,
      maxCopyConnectionsPerTable,
      invalidatedSlotBehavior,
    },
    sourceId,
  }: CreateDestinationPipelineParams,
  signal?: AbortSignal
) {
  if (!projectRef) throw new Error('projectRef is required')

  // Build destination_config based on the type
  let destination_config: components['schemas']['CreateReplicationDestinationPipelineBody']['destination_config']

  if ('bigQuery' in destinationConfig) {
    const { projectId, datasetId, serviceAccountKey, connectionPoolSize, maxStalenessMins } =
      destinationConfig.bigQuery

    destination_config = {
      big_query: {
        project_id: projectId,
        dataset_id: datasetId,
        service_account_key: serviceAccountKey,
        connection_pool_size: connectionPoolSize,
        max_staleness_mins: maxStalenessMins,
      },
    } as components['schemas']['CreateReplicationDestinationPipelineBody']['destination_config']
  } else if ('iceberg' in destinationConfig) {
    const {
      projectRef: icebergProjectRef,
      namespace,
      warehouseName,
      catalogToken,
      s3AccessKeyId,
      s3SecretAccessKey,
      s3Region,
    } = destinationConfig.iceberg

    destination_config = {
      iceberg: {
        supabase: {
          namespace,
          project_ref: icebergProjectRef,
          warehouse_name: warehouseName,
          catalog_token: catalogToken,
          s3_access_key_id: s3AccessKeyId,
          s3_secret_access_key: s3SecretAccessKey,
          s3_region: s3Region,
        },
      },
    }
  } else {
    throw new Error('Invalid destination config: must specify either bigQuery or iceberg')
  }

  const pipeline_config = {
    publication_name: publicationName,
    max_table_sync_workers: maxTableSyncWorkers,
    // ...(maxTableSyncWorkers !== undefined ? { max_table_sync_workers: maxTableSyncWorkers } : {}),
    ...(maxCopyConnectionsPerTable !== undefined
      ? { max_copy_connections_per_table: maxCopyConnectionsPerTable }
      : {}),
    ...(invalidatedSlotBehavior !== undefined
      ? { invalidated_slot_behavior: invalidatedSlotBehavior }
      : {}),
    ...(batch
      ? {
          batch: {
            ...(batch.maxFillMs !== undefined ? { max_fill_ms: batch.maxFillMs } : {}),
          },
        }
      : {}),
  }

  const { data, error } = await post('/platform/replication/{ref}/destinations-pipelines', {
    params: { path: { ref: projectRef } },
    body: {
      source_id: sourceId,
      destination_name: destinationName,
      destination_config,
      pipeline_config:
        pipeline_config as components['schemas']['CreateReplicationDestinationPipelineBody']['pipeline_config'],
    },
    signal,
  })
  if (error) {
    handleError(error)
  }

  return data
}
