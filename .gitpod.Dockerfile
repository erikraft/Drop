FROM gitpod/workspace-full

# Garante que o NVM seja carregado no bash/zsh
RUN echo "source $HOME/.nvm/nvm.sh" >> $HOME/.bashrc && \
    echo "nvm install 18 && nvm use 18" >> $HOME/.bashrc
