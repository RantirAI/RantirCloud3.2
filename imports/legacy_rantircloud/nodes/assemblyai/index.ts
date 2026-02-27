import { NodePlugin } from '@/types/node-plugin';

export const assemblyaiNode: NodePlugin = {
  type: 'assemblyai',
  name: 'AssemblyAI',
  description: 'Speech-to-text transcription and audio intelligence',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/assemblyai.png',
  color: '#FF6F00',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      placeholder: 'Enter your AssemblyAI API key',
      description: 'Your AssemblyAI API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Upload File', value: 'uploadFile' },
        { label: 'Transcribe', value: 'transcribe' },
        { label: 'Get Transcript', value: 'getTranscript' },
        { label: 'Get Sentences', value: 'getSentences' },
        { label: 'Get Paragraphs', value: 'getParagraphs' },
        { label: 'Get Subtitles', value: 'getSubtitles' },
        { label: 'Delete Transcript', value: 'deleteTranscript' },
      ],
      description: 'Select the AssemblyAI action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'uploadFile') {
      inputs.push(
        { name: 'fileUrl', label: 'File URL', type: 'text', required: true, placeholder: 'https://example.com/audio.mp3' }
      );
    } else if (action === 'transcribe') {
      inputs.push(
        { name: 'audioUrl', label: 'Audio URL', type: 'text', required: true, placeholder: 'https://example.com/audio.mp3' },
        { name: 'speakerLabels', label: 'Speaker Labels', type: 'boolean', required: false },
        { name: 'sentimentAnalysis', label: 'Sentiment Analysis', type: 'boolean', required: false }
      );
    } else if (action === 'getTranscript' || action === 'deleteTranscript') {
      inputs.push(
        { name: 'transcriptId', label: 'Transcript ID', type: 'text', required: true, placeholder: 'Enter transcript ID' }
      );
    } else if (action === 'getSentences' || action === 'getParagraphs') {
      inputs.push(
        { name: 'transcriptId', label: 'Transcript ID', type: 'text', required: true, placeholder: 'Enter transcript ID' }
      );
    } else if (action === 'getSubtitles') {
      inputs.push(
        { name: 'transcriptId', label: 'Transcript ID', type: 'text', required: true, placeholder: 'Enter transcript ID' },
        { name: 'format', label: 'Format', type: 'select', required: true, options: [
          { label: 'SRT', value: 'srt' },
          { label: 'VTT', value: 'vtt' },
        ]}
      );
    } else if (action === 'wordSearch') {
      inputs.push(
        { name: 'transcriptId', label: 'Transcript ID', type: 'text', required: true, placeholder: 'Enter transcript ID' },
        { name: 'words', label: 'Search Words', type: 'text', required: true, placeholder: 'word1,word2,word3' }
      );
    } else if (action === 'lemurTask') {
      inputs.push(
        { name: 'transcriptIds', label: 'Transcript IDs', type: 'text', required: true, placeholder: 'id1,id2,id3' },
        { name: 'prompt', label: 'Prompt', type: 'textarea', required: true, placeholder: 'Enter your LeMUR prompt' }
      );
    } else if (action === 'getLemurResponse' || action === 'purgeLemurRequestData') {
      inputs.push(
        { name: 'requestId', label: 'Request ID', type: 'text', required: true, placeholder: 'Enter LeMUR request ID' }
      );
    } else if (action === 'customApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'Endpoint', type: 'text', required: true, placeholder: '/v2/endpoint' },
        { name: 'method', label: 'Method', type: 'select', required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body', type: 'textarea', required: false, placeholder: 'JSON body' }
      );
    }

    return inputs;
  },
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Response from AssemblyAI API',
    },
    {
      name: 'transcriptText',
      type: 'string',
      description: 'Transcribed text',
    },
    {
      name: 'status',
      type: 'string',
      description: 'Transcription status',
    },
  ],
  async execute(inputs, context) {
    const { action, ...params } = inputs;
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('assemblyai-action', {
        body: { action, ...params },
      });

      if (error) throw error;

      return {
        result: data,
        transcriptText: data?.text || '',
        status: data?.status || '',
      };
    } catch (error) {
      throw new Error(`AssemblyAI API error: ${error.message}`);
    }
  },
};
