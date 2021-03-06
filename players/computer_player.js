// implements the Player-interface for a computer
// TODO: currently the computer-player is hard-coded to a 3x3 field
var ComputerPlayer = BasePlayer.extend({

    // -PRIVATE
    init: function(name, symbol){
        this._super(name, symbol);
        this.isComputerPlayer = true;
    },

    // +PUBLIC
    makeMove: function(game, board){
        // pick a field
        var field = this.pickField(board);

        // sanity check - verify pick - DEBUG ONLY
        // debug - random field
        if (typeof field === 'undefined' || typeof field.getInstVar('value') !== 'undefined') {
            // something went wrong - pick a random empty field
            field = this.getRandomField(board);
        }

        // commit the pick
        board.setFieldValue(this, field.getInstVar('y'), field.getInstVar('x'));

        // notify the game-controller about the move
        game.playerMoved();
    },

    // -PRIVATE
    pickField: function(board){
        // http://en.wikipedia.org/wiki/Tic-tac-toe#Strategy
        return (
            // 1. Win
            this.pickWin(board) ||
            // 2. Block
            this.block(board) ||
            // 3. Fork
            this.fork(board) ||
            // 4. Block opponents fork
            this.blockFork(board) ||
            // 5. Center
            this.pickCenter(board) ||
            // 6. Opposite corner
            this.pickOppositeCorner(board) ||
            // 7. Empty corner
            this.pickEmptyCorner(board) ||
            // 8. Empty side
            this.pickEmptySide(board)
        );
    },

    // -PRIVATE
    getFirstEmptyField: function(fields){
        // Return first empty field - meaning: it can still be played
        return fields.filter(function(field){
            return (typeof field.getInstVar('value') === 'undefined')
        }).pop();
    },

    // -PRIVATE
    getAllRowCombinations: function(board){
        // Return all Rows (horizontal, vertical, diagonal) that could hold
        // a winning combination

        // TODO: remove hard-coding to 3x3 field - make it generic
        return [
            // horizontal
            [ board.getField(0,0), board.getField(0,1), board.getField(0,2) ],
            [ board.getField(1,0), board.getField(1,1), board.getField(1,2) ],
            [ board.getField(2,0), board.getField(2,1), board.getField(2,2) ],

            // vertical
            [ board.getField(0,0), board.getField(1,0), board.getField(2,0) ],
            [ board.getField(0,1), board.getField(1,1), board.getField(2,1) ],
            [ board.getField(0,2), board.getField(1,2), board.getField(2,2) ],

            // diagonals
            [ board.getField(0,0), board.getField(1,1), board.getField(2,2) ],
            [ board.getField(0,2), board.getField(1,1), board.getField(2,0) ],
        ];
    },

    // -PRIVATE
    filter: function(rows, counts){
        // filter all rows out that have the wanted 'field-placements'
        // e.g.: a row with 2 of my fields and one open field, so I could win
        var me = this;
        return rows.filter(function(row){
            // check for an undefined field value
            var undefCount = 0;
            var selfCount = 0;
            var otherCount = 0;
            for (var i = 0; i < row.length; i++) {
                if (row[i].getInstVar('value') === me) {
                    selfCount += 1;
                } else if (typeof row[i].getInstVar('value') === 'undefined'){
                    undefCount += 1;
                } else {
                    otherCount += 1;
                }           
            };
            return (counts.undefCount === undefCount  &&
                    counts.selfCount  === selfCount   &&
                    counts.otherCount === otherCount
            );
        });
    },

    // -PRIVATE
    getWinningFields: function(board, counts){
        // Return all fields that can still be part of a winning strategy

        // list all possible rows
        var rowCombinations = this.getAllRowCombinations(board);

        // filter the ones that have two fields of the player and one undefined
        var possibleRows = this.filter(rowCombinations, counts);

        // pick the first undefined field
        if (possibleRows.length > 0) {
            // return the first best field to win with
            var possibleFields = [];
            possibleRows.forEach(function(rows){
                rows.map(function(field){
                    if (typeof field.getInstVar('value') === 'undefined'){
                        possibleFields.push(field);
                    }
                });
            });
            return possibleFields;
        };
    },

    // -PRIVATE
    pickCombination: function(board, counts){
        var combinations = this.getWinningFields(board, counts);
        if ((typeof combinations !== 'undefined') && combinations.length > 0) {
            return combinations[0];
        }
    },

    // -PRIVATE
    getForks: function(board, counts){
        var rowComb = this.getAllRowCombinations(board);
        var rows = this.filter(rowComb, counts);

        // find out if there are two intersecting lines, by counting
        // field occurences
        var fields = {};
        for (var i = 0; i < rows.length; i++) {
            for (var j = 0; j < rows[i].length; j++) {
                var field = rows[i][j];
                var key = ''+field.getInstVar('x')+field.getInstVar('y');
                if (typeof field.getInstVar('value') === 'undefined'){
                    if (typeof fields[key] === 'undefined'){
                        fields[key] = {
                            count : 1,
                            field : field,
                        };
                    } else {
                        fields[key].count += 1;
                    }
                }
            }
        }

        var forks = [];
        for (var property in fields) {
            if (fields.hasOwnProperty(property)) {
                if (fields[property].count > 1){
                    // found a fork
                    forks.push( fields[property].field );
                }
            }
        }
        return forks;
    },

    // -PRIVATE
    getCorners: function(board){
        var corners = [
            board.getField(0, 0),
            board.getField(0, board.getWidth()-1),
            board.getField(board.getHeight()-1, 0),
            board.getField(board.getHeight()-1, board.getWidth()-1),
        ];
        return corners;
    },

    // -PRIVATE
    pickWin: function(board){
        return this.pickCombination(board, {
            undefCount : 1,
            selfCount  : 2,
            otherCount : 0 
        });
    },

    // -PRIVATE
    block: function(board){
        return this.pickCombination(board, {
            undefCount : 1,
            selfCount  : 0,
            otherCount : 2 
        });
    },

    // -PRIVATE
    fork: function(board){
        // block a forking attempt by the other player
        return this.getForks(board, {
            undefCount : 2,
            selfCount  : 1,
            otherCount : 0,
        })[0];
    },

    // -PRIVATE
    blockFork: function(board){
        // force opponent into defending and make sure that the opponent does not
        // create a fork by doing so

        var oppForks = this.getForks(board, {
            undefCount : 2,
            selfCount  : 0,
            otherCount : 1,
        });

        var forks = {};
        oppForks.forEach(function(fork){
            var forkID = '' + fork.getInstVar('x') + fork.getInstVar('y');
            forks[forkID] = fork;
        });

        if (oppForks.length > 0) {
            // there are some forks that we need to block by forcing the other 
            // player to defend himself, but it should not force the other player
            // into creating a fork
            var fields = this.getWinningFields(board, {
                undefCount : 2,
                selfCount  : 1,
                otherCount : 0,
            });

            // find a field that is not creating a fork for the enemy
            for (var i = 0; i < fields.length; i++) {
                // get open field, which the other player would be forced to take
                var field = fields[i];
                board.setTempFieldValue(this, field.getInstVar('y'), field.getInstVar('x'));
                var openField = this.pickWin(board);
                
                // check if it creates a fork
                var futureOppForks = this.getForks(board, {
                    undefCount : 2,
                    selfCount  : 0,
                    otherCount : 1,
                });

                var badMove = futureOppForks.filter(function(fork){
                    return (fork === openField);    
                }).length > 0;
                board.resetTempFields();

                if (!badMove) {
                    return field;
                };
            };

            // no defensive move possible - directly blocking the fork
            return oppForks[0];
        };
    },

    // -PRIVATE
    pickCenter: function(board){
        // return center-field if still open
        var centerOpen = (typeof board.getFieldValue(1,1) === 'undefined');
        return centerOpen ? board.getField(1,1) : undefined;
    },

    // -PRIVATE
    pickOppositeCorner: function(board){
        var me = this;
        var corners = this.getCorners(board);
        var opponentFields = corners.filter(function(field){
            // return any field that is an opponents field
            return (typeof field.getInstVar('value') !== 'undefined' && field.getInstVar('value') !== me);
        });
        var validOppFields = opponentFields.filter(function(field){
            // return any field that has an empty opposite field
            return (typeof field.getOppisiteField().getInstVar('value') === 'undefined');
        });
        return (validOppFields.length > 0) ? validOppFields[0].getOppisiteField() : undefined;
    },

    // -PRIVATE
    pickEmptyCorner: function(board){
        var corners = this.getCorners(board);
        return this.getFirstEmptyField(corners);
    },

    // -PRIVATE
    pickEmptySide: function(board){
        var sides = [
            board.getField(0, 1),
            board.getField(1, 0),
            board.getField(2, 1),
            board.getField(1, 2),
        ];

        return this.getFirstEmptyField(sides);
    },
});
