using System;
using System.IO;
using NAudio.Wave;
using NAudio.Wasapi;

class WasapiCaptureTool {
    static BufferedWaveProvider buffer;
    static bool running = true;

    static void Main() {
        WasapiCapture capture;
        try {
            capture = new WasapiLoopbackCapture();
        } catch {
            Console.Error.WriteLine("NAudio not compatible");
            return;
        }
        buffer = new BufferedWaveProvider(capture.WaveFormat);
        buffer.BufferDuration = TimeSpan.FromSeconds(2);
        capture.DataAvailable += (s, e) => {
            buffer.AddSamples(e.Buffer, 0, e.BytesRecorded);
        };
        capture.RecordingStopped += (s, e) => { running = false; };
        capture.StartRecording();
        byte[] buf = new byte[4096];
        var stdout = Console.OpenStandardOutput();
        while (running) {
            int n = buffer.Read(buf, 0, buf.Length);
            if (n > 0) { stdout.Write(buf, 0, n); stdout.Flush(); }
            System.Threading.Thread.Sleep(5);
        }
        capture.StopRecording();
    }
}
