import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, AlertTriangle, Clock, Database, BarChart } from 'lucide-react';
import { ToolInvocation, UIMessage } from 'ai';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useChat } from '@ai-sdk/react';
import { buildDownloadLink } from '@/lib/utils';

interface DevModeModalProps {
  toolInvocation: ToolInvocation;
  messageContent: string;
  initialMessages: UIMessage[];
}

export const DevModeModal = ({ toolInvocation, messageContent }: DevModeModalProps) => {
  const [matchCount, setMatchCount] = useState(5);
  const [matchThreshold, setMatchThreshold] = useState(0.2);
  const [minContentLength, setMinContentLength] = useState(500);
  const [model, setModel] = useState('gemini-2.0-flash');
  const [collection, setCollection] = useState('brdr_documents');
  const [chunkCollection, setChunkCollection] = useState('brdr_documents_data');
  const [maxSteps, setMaxSteps] = useState(5);
  const [previewOutput, setPreviewOutput] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitTimestamp, setSubmitTimestamp] = useState<number | null>(null);
  const [metrics, setMetrics] = useState({
    totalResponseTime: 0,
    apiLatency: 0,
    renderingTime: 0,
    totalToolCallDuration: 0, 
    toolCallCount: 0,
    toolCallInitiated: false,
    tokenUsage: { input: 0, output: 0 },
  });


  const { append, messages } = useChat({
    api: '/api/search',
    initialMessages:[],
    experimental_throttle: 50,
    onFinish: (message, { finishReason, usage }) => {
      console.log('onFinish message:', message, 'usage:', usage);
      const renderTimestamp = performance.now();
      const apiResponseTimestamp = performance.now(); // Fallback: assume API response time is close to render time
      const submitTime = submitTimestamp || apiResponseTimestamp;
      const totalResponseTime = Math.round(renderTimestamp - submitTime);
      const apiLatency = Math.round(apiResponseTimestamp - submitTime);
      const renderingTime = Math.round(renderTimestamp - apiResponseTimestamp);

      // Token usage: use usage.promptTokens/completionTokens or estimate
      const inputTokens = usage?.promptTokens || Math.ceil((toolInvocation.args?.query?.length || 0) / 4);
      const outputTokens = usage?.completionTokens || Math.ceil((message.content?.length || 0) / 4);

      // Tool call metrics
      const toolCallInitiated = toolInvocation.state === 'call' || toolInvocation.state === 'result';
      const toolCallCount = toolCallInitiated ? 1 : 0; // Single tool call assumed, as toolCalls is unavailable
      const totalToolCallDuration = toolInvocation.state === 'result' && toolInvocation.result ? 
        (toolInvocation.result.duration || 0) : 0;

      setMetrics({
        totalResponseTime,
        apiLatency,
        renderingTime,
        totalToolCallDuration,
        toolCallCount,
        toolCallInitiated,
        tokenUsage: { input: inputTokens, output: outputTokens },
      });

      setPreviewOutput(message.content || 'Updated response with new settings...');
      setIsSubmitting(false);
      setSubmitTimestamp(null); // Reset timestamp
    },
  });

  // Mock retrieval data
  const retrievalData = toolInvocation.state === 'result' && toolInvocation.result ? 
    (toolInvocation.result.data || []).map((item: any, index: number) => ({
      docId: item.docId || `doc-${index}`,
      content: item.content || '',
      metadata: item.metadata || {},
      similarity: item.similarity || 0,
    })) : [];

  const performanceData = [
  { name: 'Total Response Time', value: metrics.totalResponseTime, color: '#3b82f6' },
  { name: 'API Latency', value: metrics.apiLatency, color: '#10b981' },
  { name: 'Rendering Time', value: metrics.renderingTime, color: '#f59e0b' },
].filter(item => item.value > 0); // Only show non-zero metrics

  const similarityData = retrievalData.map((item: any, index: number) => ({
    name: `Doc ${index + 1}`,
    similarity: item.similarity,
  }));

  const handleDownload = (docId: string) => {
    const downloadLink = buildDownloadLink(docId);
    const link = document.createElement('a');
    link.href = downloadLink;
    link.target = '_blank';
    link.download = `${docId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const query = toolInvocation.args?.query || '';
      console.log('Submitting settings with query:', query);
      if (!query) {
        setPreviewOutput('Error: No query found in tool invocation');
        setIsSubmitting(false);
        return;
      }
      await append(
        {
          content: query,
          role: 'user', // Changed to 'user' to trigger assistant response
        },
        {
          body: {
            collection,
            chunk_collection: chunkCollection,
            match_count: matchCount,
            match_threshold: matchThreshold,
            min_content_length: minContentLength,
            max_steps: maxSteps,
            model,
          },
        }
      );
      
    } catch (error) {
      console.error('Error submitting settings:', error);
      setPreviewOutput('Error generating preview');
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
     setPreviewOutput(messages[messages.length - 1]?.content || 'No response generated');
  }, [messages]);
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="hover:bg-blue-100">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Dev Mode</span>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-[80vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white z-10">
          <DialogTitle>Dev Mode: Performance Insights</DialogTitle>
          <DialogDescription>
            {toolInvocation.toolName} - Query at {new Date().toLocaleTimeString()}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="performance" className="mt-4">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="retrieval">Retrieval</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="session">Session</TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Total Response Time
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="ml-2 text-gray-500">ⓘ</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Time from query submission to full response rendering
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.totalResponseTime}ms
                    {metrics.totalResponseTime > 1000 && <Badge variant="destructive" className="ml-2">High</Badge>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="w-4 h-4 mr-2" />
                    API Latency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.apiLatency}ms
                    {metrics.apiLatency > 800 && <Badge variant="destructive" className="ml-2">High</Badge>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Rendering Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.renderingTime}ms</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {/* <Tool className="w-4 h-4 mr-2" /> */}
                    Tool Call Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.toolCallInitiated ? 'Initiated' : 'Not Initiated'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {/* <Tool className="w-4 h-4 mr-2" /> */}
                    Tool Call Count
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.toolCallCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart className="w-4 h-4 mr-2" />
                    Token Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.tokenUsage.input} in / {metrics.tokenUsage.output} out
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            {toolInvocation.state === 'result' && toolInvocation.result?.error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{toolInvocation.result.error}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Retrieval Tab */}
          <TabsContent value="retrieval" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Retrieved Chunks ({retrievalData.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={similarityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="similarity" stroke="#10b981" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {retrievalData.map((item: any) => (
                    <div key={item.docId} className="grid grid-cols-2 gap-4 border p-2 rounded">
                      <div className="flex-1">
                        <p className="font-medium">Doc ID: {item.docId}</p>
                        <p className="text-sm">Similarity: {item.similarity.toFixed(2)}</p>
                        <p className="text-sm text-gray-500 pt-2 wrap-anywhere">Chunk data: {item.content.slice(0, 100)}...</p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-center justify-center space-y-2">
  
                        <Button
                          variant="outline"
                          className="mt-2 hover:bg-blue-100"
                          onClick={() => handleDownload(item.docId)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="mt-2 hover:bg-blue-100"
                            >
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Document Details - {item.docId}</DialogTitle>
                            </DialogHeader>
                            <p>{item.content}</p>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>LLM Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium">Match Count</label>
                    <Slider
                      value={[matchCount]}
                      onValueChange={(value) => setMatchCount(value[0])}
                      max={10}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-1">{matchCount} documents</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Match Threshold</label>
                    <Slider
                      value={[matchThreshold]}
                      onValueChange={(value) => setMatchThreshold(value[0])}
                      max={1}
                      min={0}
                      step={0.1}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-1">{matchThreshold.toFixed(1)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Min Content Length</label>
                    <Slider
                      value={[minContentLength]}
                      onValueChange={(value) => setMinContentLength(value[0])}
                      max={1000}
                      min={100}
                      step={50}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-1">{minContentLength} characters</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Model</label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        <SelectItem value="claude-2">Claude 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Collection</label>
                    <Select value={collection} onValueChange={setCollection}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brdr_documents">BRDR Documents</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Chunk Collection</label>
                    <Select value={chunkCollection} onValueChange={setChunkCollection}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brdr_documents_data">BRDR Documents Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Max Steps</label>
                    <Slider
                      value={[maxSteps]}
                      onValueChange={(value) => setMaxSteps(value[0])}
                      max={10}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-1">{maxSteps} steps</p>
                  </div>
                  <Button
                    type="submit"
                    className="flex-shrink-0 mr-4 hover:bg-blue-100 mt-4"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">Test Changes</span>
                    )}
                  </Button>
                </form>
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium">Original Output</h3>
                    <p className="text-sm text-gray-500 mt-2">{messageContent}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Preview Output</h3>
                    {previewOutput ? (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 font-medium mb-2">Parameters:</p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-gray-700">Parameter</TableHead>
                              <TableHead className="text-gray-700">Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Match Count</TableCell>
                              <TableCell>{matchCount} documents</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Match Threshold</TableCell>
                              <TableCell>{matchThreshold.toFixed(1)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Min Content Length</TableCell>
                              <TableCell>{minContentLength} characters</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Model</TableCell>
                              <TableCell>{model}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Collection</TableCell>
                              <TableCell>{collection}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Chunk Collection</TableCell>
                              <TableCell>{chunkCollection}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Max Steps</TableCell>
                              <TableCell>{maxSteps} steps</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        <p className="text-sm text-gray-700 font-medium mt-4 mb-2">Response:</p>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words">{previewOutput}</pre>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center space-x-2">
                        <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span className="text-sm text-gray-700">Waiting for preview...</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Session Tab */}
          <TabsContent value="session" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Session Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>Total Response Time: {metrics.totalResponseTime}ms</p>
                  <p>Total Tokens: {metrics.tokenUsage.input + metrics.tokenUsage.output}</p>
                  <p>Chunks Retrieved: {retrievalData.length}</p>
                </div>
                <Button 
                className="mt-4" 
                variant="outline"
                // onClick={handleDownloadMetrics}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Metrics (JSON)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}