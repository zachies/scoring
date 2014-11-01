"use strict";

describe('ng-scores',function() {
    var ngServices = factory('services/ng-services');
    var module = factory('services/ng-scores',{
        'services/ng-services': ngServices,
        'services/log': logMock
    });

    var $scores;
    var $stages;
    var dummyTeam =  {
        number: '123',
        name: 'foo'
    };
    var rawMockStage = { id: "test", rounds: 3, name: "Test stage" };
    var rawMockScore = {
        file: 'somescore.json',
        team: dummyTeam,
        stageId: "test",
        round: 1,
        score: 123,
        originalScore: 123
    };
    var mockStage;
    var mockScore;
    var fsMock;

    beforeEach(function() {
        fsMock = createFsMock({
            "scores.json": [rawMockScore],
            "stages.json": [rawMockStage]
        });
        angular.mock.module(module.name);
        angular.mock.module(function($provide) {
            $provide.value('$fs', fsMock);
        });
        angular.mock.inject(["$scores", "$stages", function(_$scores_, _$stages_) {
            $scores = _$scores_;
            $stages = _$stages_;
        }]);
        $stages.init().then(function() {
            mockStage = $stages.get(rawMockStage.id);
            mockScore = {
                file: 'somescore.json',
                team: dummyTeam,
                stage: mockStage,
                round: 1,
                score: 123,
                originalScore: 123
            };
        });
        return $scores.init();
    });

    // Strip autogenerated properties to (hopefully ;)) arrive at the same
    // object as what was used as input to $scores.add().
    function filteredScores() {
        return $scores.scores.map(function(score) {
            return {
                file: score.file,
                team: score.team,
                stage: score.stage,
                round: score.round,
                score: score.score,
                originalScore: score.originalScore
            };
        });
    }

    describe('initialize',function() {
        it('should load mock score initially',function() {
            expect(filteredScores()).toEqual([mockScore]);
        });
    });

    describe('adding scores',function() {
        it('should add a score to the list',function() {
            $scores.clear();
            expect(filteredScores()).toEqual([]);
            $scores.add(mockScore);
            expect(filteredScores()).toEqual([mockScore]);
            // Duplicate scores are allowed in this stage
            $scores.add(mockScore);
            expect(filteredScores()).toEqual([mockScore, mockScore]);
            expect($scores.validationErrors.length).toBeGreaterThan(0);
        });
    });

    describe('loading',function() {
        it('should load from scores.json',function() {
            return $scores.load().then(function() {
                expect(fsMock.read).toHaveBeenCalledWith('scores.json');
                expect(filteredScores()).toEqual([mockScore]);
            });
        });
    });

    describe('clearing',function() {
        it('should clear the scores',function() {
            expect(filteredScores()).toEqual([mockScore]);
            $scores.clear();
            expect(filteredScores()).toEqual([]);
        });
    });

    describe('saving',function() {
        it('should write scores to scores.json',function() {
            return $scores.save().then(function() {
                expect(fsMock.write).toHaveBeenCalledWith('scores.json', [rawMockScore])
            });
        });
    });

    describe('removing',function() {
        it('should remove the provided index', function() {
            expect(filteredScores()).toEqual([mockScore]);
            $scores.remove(0);
            expect(filteredScores()).toEqual([]);
        });
    });

    describe('modification', function() {
        it('should mark modified scores', function() {
            $scores.clear();
            $scores.add(mockScore);
            mockScore.score++;
            // Simply changing the added score shouldn't matter...
            expect($scores.scores[0].score).toEqual(123);
            // ... but updating it should
            $scores.update(0, mockScore);
            expect($scores.scores[0].score).toEqual(124);
            expect($scores.scores[0].modified).toBeTruthy();
        });
    });

    describe('scoreboard', function() {
        var board;
        beforeEach(function() {
            board = $scores.scoreboard;
        });
        function fillScores(input, allowErrors) {
            $scores.beginupdate();
            $scores.clear();
            input.map(function(score) {
                $scores.add(score);
            });
            $scores.endupdate();
            if (!allowErrors) {
                $scores.scores.forEach(function(score) {
                    expect(score.error).toBeFalsy();
                });
            }
        }
        var team1 = { number: "1", name: "Fleppie 1" };
        var team2 = { number: "2", name: "Fleppie 2" };
        var team3 = { number: "3", name: "Fleppie 3" };
        var team4 = { number: "4", name: "Fleppie 4" };

        it('should output used stages', function() {
            fillScores([]);
            expect(Object.keys(board)).toEqual(["test"]);
        });

        it('should fill in all rounds for a team', function() {
            // If a team has played at all (i.e., they have a score for that stage)
            // then all other rounds for that team need to have an entry (which can
            // be null).
            fillScores([
                { team: team1, stage: mockStage, round: 2, score: 10 }
            ]);
            expect(board["test"][0].scores).toEqual([null, 10, null]);
        });

        it('should rank number > dnc > dsq > null', function() {
            fillScores([
                { team: team1, stage: mockStage, round: 1, score: 'dsq' },
                { team: team2, stage: mockStage, round: 1, score: 'dnc' },
                { team: team3, stage: mockStage, round: 1, score: -1 },
                { team: team4, stage: mockStage, round: 1, score: 1 },
            ]);
            var result = board["test"].map(function(entry) {
                return {
                    rank: entry.rank,
                    team: entry.team,
                    highest: entry.highest
                };
            });
            expect(result).toEqual([
                { rank: 1, team: team4, highest: 1 },
                { rank: 2, team: team3, highest: -1 },
                { rank: 3, team: team2, highest: 'dnc' },
                { rank: 4, team: team1, highest: 'dsq' },
            ]);

        });

        it("should assign equal rank to equal scores", function() {
            fillScores([
                { team: team1, stage: mockStage, round: 1, score: 10 },
                { team: team1, stage: mockStage, round: 2, score: 20 },
                { team: team1, stage: mockStage, round: 3, score: 30 },
                { team: team2, stage: mockStage, round: 1, score: 30 },
                { team: team2, stage: mockStage, round: 2, score: 10 },
                { team: team2, stage: mockStage, round: 3, score: 20 },
                { team: team3, stage: mockStage, round: 1, score: 30 },
                { team: team3, stage: mockStage, round: 2, score: 0 },
                { team: team3, stage: mockStage, round: 3, score: 20 },
            ]);
            var result = board["test"].map(function(entry) {
                return {
                    rank: entry.rank,
                    team: entry.team,
                    highest: entry.highest
                };
            });
            // Note: for equal ranks, teams are sorted according
            // to (ascending) team id
            expect(result).toEqual([
                { rank: 1, team: team1, highest: 30 },
                { rank: 1, team: team2, highest: 30 },
                { rank: 2, team: team3, highest: 30 },
            ]);
        });

        it("should ignore but warn about scores for unknown rounds / stages", function() {
            fillScores([
                { team: team1, stage: { id: "foo" }, round: 1, score: 0 },
                { team: team1, stage: mockStage, round: 0, score: 0 },
                { team: team1, stage: mockStage, round: 4, score: 0 },
            ], true);
            expect($scores.scores[0].error).toBeInstanceOf($scores.UnknownStageError);
            expect($scores.scores[1].error).toBeInstanceOf($scores.UnknownRoundError);
            expect($scores.scores[2].error).toBeInstanceOf($scores.UnknownRoundError);
            expect(board["test"].length).toEqual(0);
            expect($scores.validationErrors.length).toEqual(3);
        });

        it("should ignore but warn about invalid score", function() {
            fillScores([
                { team: team1, stage: mockStage, round: 1, score: "foo" },
                { team: team1, stage: mockStage, round: 2, score: NaN },
                { team: team1, stage: mockStage, round: 3, score: Infinity },
                { team: team2, stage: mockStage, round: 1, score: {} },
                { team: team2, stage: mockStage, round: 2, score: true },
                { team: team2, stage: mockStage, round: 3, score: "DSQ" }, // not sure whether we should allow this one
            ], true);
            $scores.scores.forEach(function(score) {
                expect(score.error).toBeInstanceOf($scores.InvalidScoreError);
            })
            expect(board["test"].length).toEqual(0);
            expect($scores.validationErrors.length).toEqual(6);
        });

        it("should ignore but warn about duplicate score", function() {
            fillScores([
                { team: team1, stage: mockStage, round: 1, score: 10 },
                { team: team1, stage: mockStage, round: 1, score: 20 },
            ], true);
            expect($scores.scores[1].error).toBeInstanceOf($scores.DuplicateScoreError);
            expect(board["test"][0].highest).toEqual(10);
            expect($scores.validationErrors.length).toBeGreaterThan(0);
        });

        it("should allow resolving error", function() {
            fillScores([
                { team: team1, stage: mockStage, round: 1, score: 10 },
                { team: team1, stage: mockStage, round: 1, score: 20 },
            ], true);
            expect($scores.validationErrors.length).toBeGreaterThan(0);
            $scores.update(1, { team: team1, stage: mockStage, round: 2, score: 20 });
            expect($scores.validationErrors.length).toEqual(0);
        });
    });

});