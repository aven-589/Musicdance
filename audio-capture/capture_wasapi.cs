using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;

// WASAPI Loopback Audio Capture - pure .NET COM interop
// Compile: csc -target:exe -out:capture.exe capture_wasapi.cs

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumerator { }

[ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    [PreserveSig] int EnumAudioEndpoints(int dataFlow, int stateMask, out IMMDevice devices);
    [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
}

[ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    [PreserveSig] int Activate([MarshalAs(UnmanagedType.LPStruct)] Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object interfacePtr);
}

[ComImport, Guid("1CB9AD4C-DBFA-4C32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioClient {
    [PreserveSig] int Initialize(int shareMode, int streamFlags, long hnsBufferDuration, long hnsPeriodicity, IntPtr pFormat, ref Guid audioSessionGuid);
    void GetBufferSize(out uint bufferSize);
    void GetStreamLatency(out long latency);
    void GetCurrentPadding(out uint padding);
    [PreserveSig] int IsFormatSupported(int shareMode, IntPtr pFormat, out IntPtr closestMatch);
    void GetMixFormat(out IntPtr deviceFormat);
    void GetDevicePeriod(out long defaultPeriod, out long minimumPeriod);
    void Start();
    void Stop();
    void Reset();
    void SetEventHandle(IntPtr handle);
    void GetService([MarshalAs(UnmanagedType.LPStruct)] Guid iid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
}

[ComImport, Guid("C8ADBD64-E71E-48A0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioCaptureClient {
    [PreserveSig] int GetBuffer(out IntPtr dataBuffer, out uint framesToRead, out uint flags, out long devicePosition, out long qpcPosition);
    [PreserveSig] int ReleaseBuffer(uint framesRead);
    [PreserveSig] int GetNextPacketSize(out uint framesToRead);
}

[StructLayout(LayoutKind.Sequential, Pack = 1)]
struct WAVEFORMATEX {
    public ushort wFormatTag;
    public ushort nChannels;
    public uint nSamplesPerSec;
    public uint nAvgBytesPerSec;
    public ushort nBlockAlign;
    public ushort wBitsPerSample;
    public ushort cbSize;
}

class WasapiLoopbackCapture {
    static void Main() {
        try {
            var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumerator();
            IMMDevice device;
            int hr = enumerator.GetDefaultAudioEndpoint(0, 1, out device);
            if (hr != 0) { Environment.Exit(1); return; }

            object activatedObj = null;
            Guid audioClientGuid = typeof(IAudioClient).GUID;
            hr = device.Activate(audioClientGuid, 1, IntPtr.Zero, out activatedObj);
            if (hr != 0) { Environment.Exit(2); return; }
            var audioClient = (IAudioClient)activatedObj;

            IntPtr mixFormatPtr;
            audioClient.GetMixFormat(out mixFormatPtr);
            var wf = (WAVEFORMATEX)Marshal.PtrToStructure(mixFormatPtr, typeof(WAVEFORMATEX));

            Guid emptyGuid = Guid.Empty;
            hr = audioClient.Initialize(0, 0x00020000, 0, 0, mixFormatPtr, ref emptyGuid);
            Marshal.FreeCoTaskMem(mixFormatPtr);
            if (hr != 0) { Environment.Exit(3); return; }

            object captureObj = null;
            Guid captureGuid = typeof(IAudioCaptureClient).GUID;
            audioClient.GetService(captureGuid, out captureObj);
            var captureClient = (IAudioCaptureClient)captureObj;

            audioClient.Start();
            var stdout = Console.OpenStandardOutput();

            while (true) {
                uint packetSize;
                captureClient.GetNextPacketSize(out packetSize);
                if (packetSize == 0) { Thread.Sleep(5); continue; }

                IntPtr dataPtr;
                uint framesRead;
                uint flags;
                long pos, qpc;
                hr = captureClient.GetBuffer(out dataPtr, out framesRead, out flags, out pos, out qpc);
                if (hr != 0 || framesRead == 0) continue;

                int byteCount = (int)(framesRead * wf.nBlockAlign);
                byte[] buf = new byte[byteCount];
                Marshal.Copy(dataPtr, buf, 0, byteCount);
                stdout.Write(buf, 0, byteCount);
                stdout.Flush();

                captureClient.ReleaseBuffer(framesRead);
            }
        } catch {
            Environment.Exit(5);
        }
    }
}
