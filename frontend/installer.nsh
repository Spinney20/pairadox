!macro customInstall
  ; Register application icon
  WriteRegStr HKCR "Applications\${PRODUCT_FILENAME}" "FriendlyAppName" "${PRODUCT_NAME}"
  WriteRegStr HKCR "Applications\${PRODUCT_FILENAME}" "DefaultIcon" "$INSTDIR\${PRODUCT_FILENAME},0"
  WriteRegStr HKCR "Applications\${PRODUCT_FILENAME}" "IsHostApp" ""

  ; Associate MIME types if needed
  WriteRegStr HKCR "Applications\${PRODUCT_FILENAME}\SupportedTypes" ".pairadox" ""

  ; Write additional registry keys for icon and taskbar
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "ApplicationIcon" "$INSTDIR\${PRODUCT_FILENAME},0"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "FriendlyAppName" "${PRODUCT_NAME}"

  ; Set application user model ID for taskbar icon grouping
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "AppUserModelID" "com.pairadox.ai"

  ; Set taskbar icon properties
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\Taskband" "${PRODUCT_NAME}" "$INSTDIR\${PRODUCT_FILENAME}"

  ; Create additional registry entries for taskbar icon
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "" "$INSTDIR\${PRODUCT_FILENAME}"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "Path" "$INSTDIR"

  ; Refresh shell icons
  System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend

!macro customUninstall
  ; Clean up registry entries
  DeleteRegKey HKCR "Applications\${PRODUCT_FILENAME}"
  DeleteRegKey HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}"
  DeleteRegKey HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}"

  ; Refresh shell icons
  System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend
