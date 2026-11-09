#!/usr/bin/env python3
"""Add an ephemeral XCTest UI target to a copied Capacitor project.

The generated project is disposable CI state. The checked-in App project and
the signed-candidate source are never modified.
"""

from pathlib import Path
import argparse
import re
from xml.sax.saxutils import escape


IDS = {
    "build_file": "F90000000000000000000001",
    "file_ref": "F90000000000000000000002",
    "sources_phase": "F90000000000000000000003",
    "target": "F90000000000000000000004",
    "debug_config": "F90000000000000000000005",
    "release_config": "F90000000000000000000006",
    "config_list": "F90000000000000000000007",
    "group": "F90000000000000000000008",
    "product_ref": "F90000000000000000000009",
    "frameworks_phase": "F9000000000000000000000A",
    "resources_phase": "F9000000000000000000000B",
    "container_proxy": "F9000000000000000000000C",
    "target_dependency": "F9000000000000000000000D",
}
APP_TARGET = "504EC3031FED79650016851F"
ROOT_GROUP = "504EC2FB1FED79650016851F"
PROJECT = "504EC2FC1FED79650016851F"


def insert_before(text, marker, payload):
    if text.count(marker) != 1:
        raise ValueError(f"expected exactly one marker: {marker}")
    position = text.index(marker)
    return text[:position] + payload + text[position:]


def replace_once(text, marker, replacement):
    if text.count(marker) != 1:
        raise ValueError(f"expected exactly one replacement marker: {marker}")
    return text.replace(marker, replacement, 1)


def insert_section(text, section_name, payload):
    end_marker = f"/* End {section_name} section */"
    if end_marker in text:
        return insert_before(text, end_marker, payload)
    root_marker = "\t};\n\trootObject = "
    wrapped = f"/* Begin {section_name} section */\n{payload}/* End {section_name} section */\n"
    return replace_once(text, root_marker, wrapped + root_marker)


def balanced_block(text, start):
    opening = text.index("{", start)
    depth = 0
    for position in range(opening, len(text)):
        if text[position] == "{":
            depth += 1
        elif text[position] == "}":
            depth -= 1
            if depth == 0:
                return text[start : position + 1]
    raise ValueError("unterminated project block")


def existing_app_build_settings(text):
    section_start = text.index("/* Begin XCBuildConfiguration section */")
    section_end = text.index("/* End XCBuildConfiguration section */", section_start)
    section = text[section_start:section_end]
    blocks = []
    for match in re.finditer(r"\n\t\t[A-F0-9]+ /\* [^*]+ \*/ = \{", section):
        block = balanced_block(section, match.start() + 1)
        if "PRODUCT_BUNDLE_IDENTIFIER = ca.ashbi.habittracker;" in block:
            blocks.append(block)
    if not blocks:
        raise ValueError("could not locate existing Faithful Days app build settings")
    return tuple(blocks)


def patch_project(project_file):
    text = project_file.read_text()
    ids = IDS
    original_app_settings = existing_app_build_settings(text)
    for identifier in ids.values():
        if identifier in text:
            raise ValueError(f"ephemeral project ID collides with source: {identifier}")

    text = insert_before(
        text,
        "/* End PBXBuildFile section */",
        f'\t\t{ids["build_file"]} /* FaithfulDaysNativeJourneyUITests.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {ids["file_ref"]} /* FaithfulDaysNativeJourneyUITests.swift */; }};\n',
    )
    text = insert_before(
        text,
        "/* End PBXFileReference section */",
        f'\t\t{ids["file_ref"]} /* FaithfulDaysNativeJourneyUITests.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = FaithfulDaysNativeJourneyUITests.swift; sourceTree = "<group>"; }};\n'
        f'\t\t{ids["product_ref"]} /* FaithfulDaysNativeJourneyUITests.xctest */ = {{isa = PBXFileReference; explicitFileType = wrapper.cfbundle; includeInIndex = 0; path = FaithfulDaysNativeJourneyUITests.xctest; sourceTree = BUILT_PRODUCTS_DIR; }};\n',
    )

    root_marker = "\t\tDA7E5071F9684F5982B6372A /* FaithfulDaysWidget */ = {"
    text = replace_once(
        text,
        root_marker,
        f'\t\t{ids["group"]} /* NativeJourney */ = {{isa = PBXGroup; children = ({ids["file_ref"]} /* FaithfulDaysNativeJourneyUITests.swift */); path = NativeJourney; sourceTree = "<group>"; }};\n'
        + root_marker,
    )
    text = replace_once(
        text,
        f'\t\t{ROOT_GROUP} = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (',
        f'\t\t{ROOT_GROUP} = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t{ids["group"]} /* NativeJourney */,',
    )
    text = replace_once(
        text,
        f'\t\t\t\t74D2D4A1BDE14C05BA7EDC14 /* FaithfulDaysWidget.appex */,\n\t\t\t);\n\t\t\tname = Products;',
        f'\t\t\t\t74D2D4A1BDE14C05BA7EDC14 /* FaithfulDaysWidget.appex */,\n\t\t\t\t{ids["product_ref"]} /* FaithfulDaysNativeJourneyUITests.xctest */,\n\t\t\t);\n\t\t\tname = Products;',
    )

    text = insert_before(
        text,
        "/* End PBXNativeTarget section */",
        f'''\t\t{ids["target"]} /* FaithfulDaysNativeJourneyUITests */ = {{
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = {ids["config_list"]} /* Build configuration list for PBXNativeTarget "FaithfulDaysNativeJourneyUITests" */;
\t\t\tbuildPhases = (
\t\t\t\t{ids["sources_phase"]} /* Sources */,
\t\t\t\t{ids["frameworks_phase"]} /* Frameworks */,
\t\t\t\t{ids["resources_phase"]} /* Resources */,
\t\t\t);
\t\t\tbuildRules = ();
\t\t\tdependencies = (
\t\t\t\t{ids["target_dependency"]} /* PBXTargetDependency */,
\t\t\t);
\t\t\tname = FaithfulDaysNativeJourneyUITests;
\t\t\tproductName = FaithfulDaysNativeJourneyUITests;
\t\t\tproductReference = {ids["product_ref"]} /* FaithfulDaysNativeJourneyUITests.xctest */;
\t\t\tproductType = "com.apple.product-type.bundle.ui-testing";
\t\t}};
''',
    )
    text = replace_once(
        text,
        f'\t\t\t\tE2A3193428994ADEA11E25B3 /* "FaithfulDaysWidget" */,\n\t\t\t);',
        f'\t\t\t\tE2A3193428994ADEA11E25B3 /* "FaithfulDaysWidget" */,\n\t\t\t\t{ids["target"]} /* FaithfulDaysNativeJourneyUITests */,\n\t\t\t);',
    )
    text = replace_once(
        text,
        "\t\t\t\t\t\tProvisioningStyle = Automatic;\n\t\t\t\t\t};\n\t\t\t\t};\n\t\t\t};",
        "\t\t\t\t\t\tProvisioningStyle = Automatic;\n\t\t\t\t\t};\n"
        f'\t\t\t\t\t{ids["target"]} = {{\n\t\t\t\t\t\tCreatedOnToolsVersion = 2600;\n\t\t\t\t\t\tTestTargetID = {APP_TARGET};\n\t\t\t\t\t}};\n\t\t\t\t}};\n\t\t\t}};',
    )

    text = insert_before(
        text,
        "/* End PBXSourcesBuildPhase section */",
        f'''\t\t{ids["sources_phase"]} /* Sources */ = {{
\t\t\tisa = PBXSourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t\t{ids["build_file"]} /* FaithfulDaysNativeJourneyUITests.swift in Sources */,
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
''',
    )

    text = insert_before(
        text,
        "/* End PBXFrameworksBuildPhase section */",
        f'''\t\t{ids["frameworks_phase"]} /* Frameworks */ = {{
\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
''',
    )

    text = insert_before(
        text,
        "/* End PBXResourcesBuildPhase section */",
        f'''\t\t{ids["resources_phase"]} /* Resources */ = {{
\t\t\tisa = PBXResourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
''',
    )

    text = insert_before(
        text,
        "/* End XCBuildConfiguration section */",
        f'''\t\t{ids["debug_config"]} /* Debug */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\t\tCODE_SIGNING_ALLOWED = NO;
\t\t\t\tCODE_SIGNING_REQUIRED = NO;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tGENERATE_INFOPLIST_FILE = YES;
\t\t\t\tINFOPLIST_KEY_CFBundleDisplayName = FaithfulDaysNativeJourneyUITests;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 15.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ca.ashbi.habittracker.nativejourneytests;
\t\t\t\tPRODUCT_NAME = FaithfulDaysNativeJourneyUITests;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t\tTEST_TARGET_NAME = App;
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{ids["release_config"]} /* Release */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\t\tCODE_SIGNING_ALLOWED = NO;
\t\t\t\tCODE_SIGNING_REQUIRED = NO;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tGENERATE_INFOPLIST_FILE = YES;
\t\t\t\tINFOPLIST_KEY_CFBundleDisplayName = FaithfulDaysNativeJourneyUITests;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 15.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ca.ashbi.habittracker.nativejourneytests;
\t\t\t\tPRODUCT_NAME = FaithfulDaysNativeJourneyUITests;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t\tTEST_TARGET_NAME = App;
\t\t\t}};
\t\t\tname = Release;
\t\t}};
''',
    )
    text = insert_before(
        text,
        "/* End XCConfigurationList section */",
        f'''\t\t{ids["config_list"]} /* Build configuration list for PBXNativeTarget "FaithfulDaysNativeJourneyUITests" */ = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{ids["debug_config"]} /* Debug */,
\t\t\t\t{ids["release_config"]} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
''',
    )

    text = insert_section(
        text,
        "PBXTargetDependency",
        f'''\t\t{ids["target_dependency"]} /* PBXTargetDependency */ = {{
\t\t\tisa = PBXTargetDependency;
\t\t\ttarget = {APP_TARGET} /* App */;
\t\t\ttargetProxy = {ids["container_proxy"]} /* PBXContainerItemProxy */;
\t\t}};
''',
    )

    text = insert_section(
        text,
        "PBXContainerItemProxy",
        f'''\t\t{ids["container_proxy"]} /* PBXContainerItemProxy */ = {{
\t\t\tisa = PBXContainerItemProxy;
\t\t\tcontainerPortal = {PROJECT} /* Project object */;
\t\t\tproxyType = 1;
\t\t\tremoteGlobalIDString = {APP_TARGET};
\t\t\tremoteInfo = App;
\t\t}};
''',
    )

    if any(block not in text for block in original_app_settings):
        raise ValueError("ephemeral overlay changed existing Faithful Days app build settings")

    project_file.write_text(text)


def write_scheme(scheme_file, environment):
    ids = IDS
    scheme_file.parent.mkdir(parents=True, exist_ok=True)
    xml_entities = {'"': "&quot;", "'": "&apos;"}
    variables = "\n".join(
        f'      <EnvironmentVariable key="{escape(key, xml_entities)}" value="{escape(value, xml_entities)}" isEnabled="YES"/>'
        for key, value in environment.items()
    )
    scheme_file.write_text(
        f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2600" version="1.7">
  <BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES">
    <BuildActionEntries>
      <BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">
        <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{APP_TARGET}" BuildableName="App.app" BlueprintName="App" ReferencedContainer="container:App.xcodeproj"/>
      </BuildActionEntry>
      <BuildActionEntry buildForTesting="YES" buildForRunning="NO" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="NO">
        <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{ids["target"]}" BuildableName="FaithfulDaysNativeJourneyUITests.xctest" BlueprintName="FaithfulDaysNativeJourneyUITests" ReferencedContainer="container:App.xcodeproj"/>
      </BuildActionEntry>
    </BuildActionEntries>
  </BuildAction>
  <TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.DebuggerFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="NO">
    <Testables>
      <TestableReference skipped="NO" parallelizable="NO">
        <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{ids["target"]}" BuildableName="FaithfulDaysNativeJourneyUITests.xctest" BlueprintName="FaithfulDaysNativeJourneyUITests" ReferencedContainer="container:App.xcodeproj"/>
      </TestableReference>
    </Testables>
    <EnvironmentVariables>
{variables}
    </EnvironmentVariables>
  </TestAction>
  <LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.DebuggerFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="YES" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES">
    <BuildableProductRunnable runnableDebuggingMode="0">
      <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{APP_TARGET}" BuildableName="App.app" BlueprintName="App" ReferencedContainer="container:App.xcodeproj"/>
    </BuildableProductRunnable>
  </LaunchAction>
  <ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES">
    <BuildableProductRunnable runnableDebuggingMode="0">
      <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{APP_TARGET}" BuildableName="App.app" BlueprintName="App" ReferencedContainer="container:App.xcodeproj"/>
    </BuildableProductRunnable>
  </ProfileAction>
  <AnalyzeAction buildConfiguration="Debug"/>
  <ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
'''
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--scheme", type=Path, required=True)
    parser.add_argument("--source-commit", required=True)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--device-label", required=True)
    parser.add_argument("--device-udid", required=True)
    args = parser.parse_args()
    environment = {
        "EXPECTED_COMMIT": args.source_commit,
        "JOURNEY_OUTPUT_ROOT": args.output_root,
        "JOURNEY_DEVICE_LABEL": args.device_label,
        "JOURNEY_DEVICE_UDID": args.device_udid,
    }
    if any(not value for value in environment.values()):
        parser.error("all journey metadata values must be non-empty")
    patch_project(args.project)
    write_scheme(args.scheme, environment)


if __name__ == "__main__":
    main()
