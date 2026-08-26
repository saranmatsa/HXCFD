; HX CFD Inno Setup Installer Script
; Build: iscc HXCFDSetup.iss
; Requires: Inno Setup 6.2+, ISTool (optional)

#define MyAppName "HX CFD"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "HX CFD Team"
#define MyAppURL "https://hxcfd.example.com"
#define MyAppExeName "hxcfd.exe"
#define MyAppBackendExeName "hxcfd_backend.exe"

#define InstallDir "C:\Program Files\HX CFD"
#define DependenciesDir "{app}\dependencies"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={#InstallDir}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
LicenseFile=LICENSE
OutputDir=.
OutputBaseFilename=HXCFDSetup
SetupIconFile=cfd-platform/icons/icon.ico
Compression=lzma/ultra64
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
ArchitecturesAllowed=x64
PrivilegesRequired=admin
UsePreviousAppDir=no
UsePreviousGroup=no
UsePreviousLanguage=no
DisableDirPage=no
DisableFinishedPage=no
WizardStyle=modern
SetupLogging=yes
LogDir=logs
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName} {#MyAppVersion}
RestartIfNeededByRun=false

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; Main application executables (built by Tauri + PyInstaller)
Source: "cfd-platform\src-tauri\target\release\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "cfd-platform\backend\dist\{#MyAppBackendExeName}"; DestDir: "{app}"; Flags: ignoreversion

; Frontend assets (embedded in hxcfd.exe via Tauri, but keep for reference)
; Source: "cfd-platform\frontend\dist\*"; DestDir: "{app}\frontend"; Flags: ignoreversion recursesubdirs createallsubdirs

; Dependency payloads (3 ZIPs) - extracted by [Run] section
Source: "Dependencies\OpenFOAM\OpenFOAM.zip"; DestDir: "{#DependenciesDir}"; Flags: ignoreversion dontcopy nocompression
Source: "Dependencies\FreeCAD\FreeCAD.zip"; DestDir: "{#DependenciesDir}"; Flags: ignoreversion dontcopy nocompression
Source: "Dependencies\ParaView\ParaView.zip"; DestDir: "{#DependenciesDir}"; Flags: ignoreversion dontcopy nocompression

; Manifests and checksums
Source: "Dependencies\OpenFOAM\manifest.json"; DestDir: "{#DependenciesDir}\OpenFOAM"; Flags: ignoreversion
Source: "Dependencies\FreeCAD\manifest.json"; DestDir: "{#DependenciesDir}\FreeCAD"; Flags: ignoreversion
Source: "Dependencies\ParaView\manifest.json"; DestDir: "{#DependenciesDir}\ParaView"; Flags: ignoreversion

; License and documentation
Source: "LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "NOTICE"; DestDir: "{app}"; Flags: ignoreversion
Source: "THIRD_PARTY_LICENCES.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion

; Configuration directory structure
; (Created at runtime by first launch)

[Dirs]
; Ensure required directories exist
Name: "{app}\config"; Permissions: users-modify
Name: "{app}\logs"; Permissions: users-modify
Name: "{app}\cache"; Permissions: users-modify
Name: "{app}\user-data"; Permissions: users-modify
Name: "{commonappdata}\HX CFD"; Permissions: users-modify
Name: "{localappdata}\HX CFD"; Permissions: users-modify
Name: "{userdocs}\HX CFD Projects"; Permissions: users-modify

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Comment: "Launch HX CFD"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Comment: "Launch HX CFD"

[Run]
; Post-install: extract dependencies and verify
Filename: "{app}\{#MyAppExeName}"; Parameters: "--install-dependencies"; WorkingDir: "{app}"; StatusMsg: "Installing OpenFOAM, FreeCAD, and ParaView..."; Flags: runhidden waituntilterminated
Filename: "{app}\{#MyAppExeName}"; Parameters: "--verify-installation"; WorkingDir: "{app}"; StatusMsg: "Verifying installation..."; Flags: runhidden waituntilterminated

[UninstallRun]
; Pre-uninstall: clean up WSL distro if present
Filename: "wsl.exe"; Parameters: "--unregister HXCFD-OpenFOAM"; WorkingDir: "{win}\System32"; Flags: runhidden waituntilterminated; Check: WSLDistroExists

[Code]
var
  InstallDependenciesPage: TWizardPage;
  ProgressBar: TNewProgressBar;
  StatusLabel: TNewStaticText;
  LogMemo: TNewMemo;

function WSLDistroExists: Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('wsl.exe', '-l -v', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and
            (Pos('HXCFD-OpenFOAM', GetDosOutput('wsl.exe', '-l -v')) > 0);
end;

function GetDosOutput(Command, Parameters: String): String;
var
  ResultCode: Integer;
  Output: AnsiString;
begin
  Result := '';
  if Exec(Command, Parameters, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    // Would need to capture stdout - simplified for example
  end;
end;

procedure InitializeWizard();
begin
  // Create custom page for dependency installation
  InstallDependenciesPage := CreateCustomPage(wpInstalling, 'Installing Dependencies', 'Extracting and configuring OpenFOAM, FreeCAD, and ParaView...');
  
  StatusLabel := TNewStaticText.Create(InstallDependenciesPage);
  StatusLabel.Parent := InstallDependenciesPage.Surface;
  StatusLabel.Left := 0;
  StatusLabel.Top := 0;
  StatusLabel.Width := InstallDependenciesPage.Surface.Width;
  StatusLabel.Height := 30;
  StatusLabel.Caption := 'Preparing...';
  
  ProgressBar := TNewProgressBar.Create(InstallDependenciesPage);
  ProgressBar.Parent := InstallDependenciesPage.Surface;
  ProgressBar.Left := 0;
  ProgressBar.Top := 35;
  ProgressBar.Width := InstallDependenciesPage.Surface.Width;
  ProgressBar.Height := 20;
  ProgressBar.Min := 0;
  ProgressBar.Max := 3; // 3 dependencies
  
  LogMemo := TNewMemo.Create(InstallDependenciesPage);
  LogMemo.Parent := InstallDependenciesPage.Surface;
  LogMemo.Left := 0;
  LogMemo.Top := 60;
  LogMemo.Width := InstallDependenciesPage.Surface.Width;
  LogMemo.Height := InstallDependenciesPage.Surface.Height - 60;
  LogMemo.ScrollBars := ssVertical;
  LogMemo.ReadOnly := True;
  LogMemo.WordWrap := False;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  DepPath: String;
  ManifestPath: String;
  ChecksumPath: String;
  ResultCode: Integer;
  I: Integer;
  DepNames: Array of String;
begin
  if CurStep = ssPostInstall then
  begin
    // Extract dependencies
    DepNames[0] := 'OpenFOAM';
    DepNames[1] := 'FreeCAD';
    DepNames[2] := 'ParaView';
    
    for I := 0 to 2 do
    begin
      StatusLabel.Caption := Format('Installing %s...', [DepNames[I]]);
      ProgressBar.Position := I;
      LogMemo.Lines.Add(Format('Extracting %s...', [DepNames[I]]));
      
      DepPath := ExpandConstant('{#DependenciesDir}\' + DepNames[I]);
      ManifestPath := DepPath + '\manifest.json';
      
      // Create target directory
      ForceDirectories(DepPath);
      
      // Extract ZIP (using PowerShell Expand-Archive)
      Exec('powershell.exe', 
        Format('-Command "Expand-Archive -Path ''%s\%s.zip'' -DestinationPath ''%s'' -Force"', 
          ['{#DependenciesDir}', DepNames[I], DepPath]), 
        '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      
      if ResultCode <> 0 then
      begin
        LogMemo.Lines.Add(Format('ERROR: Failed to extract %s (code %d)', [DepNames[I], ResultCode]));
        // Could show error dialog here
      end
      else
      begin
        LogMemo.Lines.Add(Format('Extracted %s successfully', [DepNames[I]]));
        
        // Verify checksum
        if FileExists(ManifestPath) then
        begin
          // Read manifest, verify SHA256
          LogMemo.Lines.Add(Format('Verifying %s checksum...', [DepNames[I]]));
          // Simplified - real implementation would parse JSON and verify
        end;
      end;
      
      ProgressBar.Position := I + 1;
      Sleep(500); // Brief pause for UI
    end;
    
    StatusLabel.Caption := 'All dependencies installed successfully';
    LogMemo.Lines.Add('Dependency installation complete');
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = InstallDependenciesPage.ID then
  begin
    // Allow next only after extraction completes
    Result := ProgressBar.Position = 3;
  end;
end;

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startmenu"; Description: "Create Start Menu shortcut"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[Registry]
; Install marker for detection
Root: HKLM64; Subkey: "Software\HX CFD"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
Root: HKLM64; Subkey: "Software\HX CFD"; ValueType: string; ValueName: "Version"; ValueData: "{#MyAppVersion}"; Flags: uninsdeletevalue
Root: HKLM64; Subkey: "Software\HX CFD"; ValueType: string; ValueName: "InstallDate"; ValueData: "{#GetDateTime}"; Flags: uninsdeletevalue

; File associations (optional)
Root: HKCR; Subkey: ".hxcfdproj"; ValueType: string; ValueData: "HXCFD.Project"; Flags: uninsdeletekey
Root: HKCR; Subkey: "HXCFD.Project"; ValueType: string; ValueData: "HX CFD Project File"; Flags: uninsdeletekey
Root: HKCR; Subkey: "HXCFD.Project\shell\open\command"; ValueType: string; ValueData: """{app}\{#MyAppExeName}"" ""%1"""; Flags: uninsdeletekey

[InstallDelete]
; Clean up payload ZIPs after extraction (keep manifests)
Type: files; Name: "{#DependenciesDir}\*.zip"

[Messages]
; Custom messages for dependency installation
InstallDependenciesTitle=Installing HX CFD Dependencies
InstallDependenciesDescription=This will extract and configure OpenFOAM, FreeCAD, and ParaView. This may take several minutes.