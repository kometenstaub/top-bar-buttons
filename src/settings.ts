import { PluginSettingTab, App, Setting, setIcon, Platform } from 'obsidian';
import type TopBarButtonsPlugin from './main';
import CommandSuggester from './ui/commandSuggester';
import IconPicker from './ui/iconPicker';
import type { Buttons } from './interfaces';

export default class TopBarButtonsSettingTab extends PluginSettingTab {
    plugin: TopBarButtonsPlugin;

    constructor(app: App, plugin: TopBarButtonsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        addEventListener('TopBar-addedCommand', () => {
            this.display();
        });
    }

    display(): void {
        const { containerEl } = this;
        const { settings } = this.plugin;

        containerEl.empty();

        containerEl.createEl('h2', {
            text: 'Customizable Page Header Settings',
        });

        containerEl.createEl('p', {
            text: 'The buttons are added in the order in which they are shown here. This only takes effect after a reload.',
        });

        new Setting(containerEl)
            .setName('Show buttons on desktop')
            .setDesc(
                'By default, the buttons will only be shown in Obsidian Mobile. \
                It requires a reload after being toggled to take effect.'
            )
            .addToggle((toggle) => {
                toggle.setValue(settings.desktop).onChange(async (state) => {
                    settings.desktop = state;
                    await this.plugin.saveSettings();
                    this.display();
                    if (!state) {
                        for (let button of settings.enabledButtons) {
                            button.showButtons = 'mobile';
                        }
                        await this.plugin.saveSettings();
                    }
                });
            });

        // Thank you: https://github.com/phibr0/obsidian-customizable-sidebar/blob/50099ff41b17758b20f52bfd9a80abf8319c29fb/src/ui/settingsTab.ts
        new Setting(containerEl)
            .setName('Add Button')
            .setDesc(
                'Add a new button left to the switch edit/preview mode toggle.'
            )
            .addButton((button) => {
                button.setButtonText('Add Command').onClick(() => {
                    new CommandSuggester(this.plugin).open();
                });
            });

        for (let i = 0; i < settings.enabledButtons.length; i++) {
            let command = settings.enabledButtons[i];
            const iconDiv = createDiv({ cls: 'CS-settings-icon' });
            setIcon(iconDiv, command.icon, 24);
            let setting = new Setting(containerEl).setName(command.name);
            if (settings.desktop) {
                setting.addDropdown((dropdown) => {
                    dropdown
                        .addOption(
                            'both',
                            'Add button for both mobile and desktop.'
                        )
                        .addOption('mobile', 'Add button only for mobile.')
                        .addOption('desktop', 'Add button only for desktop.')
                        .setValue(command.showButtons)
                        .onChange(
                            //@ts-ignore
                            async (newValue: Buttons) => {
                                command.showButtons = newValue;
                                settings.enabledButtons[i] = command;
                                await this.plugin.saveSettings();
                                if (
                                    newValue === 'desktop' &&
                                    Platform.isMobile
                                ) {
                                    this.plugin.removeButton(command.id);
                                } else if (
                                    newValue === 'mobile' &&
                                    Platform.isDesktop
                                ) {
                                    this.plugin.removeButton(command.id);
                                }
                            }
                        );
                });
            }
            setting
                .addExtraButton((button) => {
                    button
                        .setIcon('trash')
                        .setTooltip('Remove Command')
                        .onClick(async () => {
                            settings.enabledButtons.remove(command);
                            this.plugin.removeButton(command.id);
                            await this.plugin.saveSettings();
                            this.display();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon('gear')
                        .setTooltip('Edit Icon')
                        .onClick(() => {
                            const index = settings.enabledButtons.findIndex(
                                (el) => el === command
                            );
                            new IconPicker(this.plugin, command, index).open();
                        });
                });
            setting.nameEl.prepend(iconDiv);
            setting.nameEl.addClass('CS-flex');
        }
    }
}
